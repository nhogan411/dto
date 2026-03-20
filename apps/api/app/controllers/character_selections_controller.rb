class CharacterSelectionsController < ApplicationController
  include JwtAuthenticatable

  before_action :authenticate_user!
  before_action :set_game

  def create
    return render_forbidden unless player_in_game?

    player_character_ids = Array(params[:player_character_ids]).map { |value| Integer(value, exception: false) }.compact

    return render_unprocessable_entity("player_character_ids must contain exactly 2 ids") unless player_character_ids.size == 2
    return render_unprocessable_entity("player_character_ids cannot contain duplicates") if player_character_ids.uniq.size != 2

    owned_ids = PlayerCharacter.for_owner(current_user).where(id: player_character_ids).pluck(:id)
    return render_unprocessable_entity("player_character_ids must belong to current user") unless owned_ids.size == 2

    @game.with_lock do
      @game.reload

      picks_column = picks_column_for(current_user)
      raise SelectionError, "Already confirmed" if @game.public_send(picks_column).present?
      raise SelectionError, "Game is not pending" unless @game.pending?

      @game.update!(picks_column => player_character_ids)

      if @game.both_picked?
        create_characters_for_selections!(@game)

        initiative_order = InitiativeService.roll(@game.characters.reload)
        current_turn_character = @game.characters.find_by(id: initiative_order.first)

        @game.update!(
          status: :active,
          turn_order: initiative_order,
          current_turn_index: 0,
          current_turn_user_id: current_turn_character&.user_id
        )
      end
    end

    if @game.reload.active?
      Broadcaster.game_updated(@game, status: @game.status, turn_order: @game.turn_order, current_turn_index: @game.current_turn_index)
    end

    render json: { data: { game: serialize_game(@game) } }
  rescue SelectionError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages.presence || [ e.message ] }, status: :unprocessable_entity
  end

  private

  class SelectionError < StandardError; end

  def set_game
    @game = Game.includes(:characters, :challenger, :challenged).find_by(id: params[:id])
    return if @game

    render_not_found and return
  end

  def player_in_game?
    @game.challenger_id == current_user.id || @game.challenged_id == current_user.id
  end

  def picks_column_for(user)
    return :challenger_picks if user.id == @game.challenger_id

    :challenged_picks
  end

  def create_characters_for_selections!(game)
    game.characters.destroy_all

    config = game.board_config.with_indifferent_access
    challenger_tiles = BoardConfig.spawn_tiles(config, "challenger").shuffle
    challenged_tiles = BoardConfig.spawn_tiles(config, "challenged").shuffle

    # Load PlayerCharacters in picks order (not DB order)
    pcs_by_id = PlayerCharacter.where(id: game.challenger_picks).index_by(&:id)
    challenger_pcs = game.challenger_picks.map { |id| pcs_by_id[id] || raise("PlayerCharacter #{id} not found for game #{game.id}") }

    pcs_by_id = PlayerCharacter.where(id: game.challenged_picks).index_by(&:id)
    challenged_pcs = game.challenged_picks.map { |id| pcs_by_id[id] || raise("PlayerCharacter #{id} not found for game #{game.id}") }

    challenger_pcs.zip(challenger_tiles).each { |pc, tile| game.characters.create!(character_attributes_for(game.challenger, tile, player_character: pc)) }
    challenged_pcs.zip(challenged_tiles).each { |pc, tile| game.characters.create!(character_attributes_for(game.challenged, tile, player_character: pc)) }
  end

   def character_attributes_for(user, position, player_character:)
     x, y = position[0], position[1]
     facing = y > 1 ? { x: x, y: y - 1 } : { x: x, y: y + 1 }

     {
       user: user,
       max_hp: 10,
       current_hp: 10,
       is_defending: false,
       stats: {},
       position: { x: x, y: y },
       facing_tile: facing,
       icon: player_character.icon,
       name: player_character.name
     }
   end

   def serialize_game(game)
     {
       id: game.id,
       challenger_id: game.challenger_id,
       challenged_id: game.challenged_id,
       challenger_username: game.challenger.username,
       challenged_username: game.challenged.username,
       status: game.status,
       board_config: serialize_board_config(game.board_config),
       current_turn_user_id: game.current_turn_user_id,
       winner_id: game.winner_id,
       turn_order: game.turn_order,
       current_turn_index: game.current_turn_index,
       characters: game.characters.order(:id).map { |character| serialize_character(character) }
     }
   end

   def serialize_board_config(board_config)
     config = board_config.with_indifferent_access

     {
       tiles: config[:tiles]
     }
   end

  def serialize_character(character)
    {
      id: character.id,
      user_id: character.user_id,
      position: character.position,
      facing_tile: character.facing_tile,
      current_hp: character.current_hp,
      max_hp: character.max_hp,
      is_defending: character.is_defending,
      stats: character.stats,
      icon: character.icon
    }
  end

  def render_unprocessable_entity(message)
    render json: { errors: [ message ] }, status: :unprocessable_entity
  end

  def render_forbidden
    render json: { errors: [ "Forbidden" ] }, status: :forbidden
  end

  def render_not_found
    render json: { errors: [ "Game not found" ] }, status: :not_found
  end
end
