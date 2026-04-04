class GamesController < ApplicationController
  include JwtAuthenticatable

  class GameError < StandardError; end

  VALID_STARTING_POSITION_INDICES = [ 0, 1 ].freeze
   VISIBLE_STATUSES = [ :pending, :active, :accepted ].freeze

  before_action :authenticate_user!
  before_action :set_game, only: [ :show, :accept, :decline, :choose_position ]
  before_action :set_game_for_player!, only: [ :state, :replay ]

  def create
    challenged_user = User.find_by(id: create_params[:challenged_id])
    return render_unprocessable_entity("Challenged user must exist") unless challenged_user
    return render_unprocessable_entity("Challenged user must be friends") unless friends?(current_user, challenged_user)
    return render_unprocessable_entity("Active or pending game already exists for this pair") if active_or_pending_game_exists?(current_user, challenged_user)

    game = nil

    Game.transaction do
      game = Game.create!(
        challenger: current_user,
        challenged: challenged_user,
        status: :pending,
        expires_at: 48.hours.from_now,
        board_config: BoardGenerator.call
      )

      challenger_start_position = start_positions_for(game).first

      game.game_characters.create!(character_attributes_for(current_user, challenger_start_position))
    end

    broadcast_game_invitation(challenged_user, game)

    render json: { data: { game: serialize_game(game.reload) } }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages.presence || [ e.message ] }, status: :unprocessable_entity
  end

   def index
      games = visible_games
        .where(status: VISIBLE_STATUSES)
        .includes(:game_characters, :challenger, :challenged)
        .order(created_at: :desc)

     render json: { data: { games: games.map { |game| serialize_game(game) } } }
   end

  def show
    render json: { data: { game: serialize_game(@game) } }
  end

  def accept
    return render_forbidden unless challenged_player?

    first_move = params[:first_move] == true || params[:first_move] == "true"

    starting_position_index = parse_starting_position_index

    if first_move && params[:starting_position_index].nil?
      accept_first_move
      return
    end

    return render_unprocessable_entity("starting_position_index must be 0 or 1") unless VALID_STARTING_POSITION_INDICES.include?(starting_position_index)

    @game.with_lock do
      raise GameError, "Game is not pending" unless @game.pending?

      start_positions = start_positions_for(@game)
      challenger_position = start_positions[1 - starting_position_index]
      challenged_position = start_positions[starting_position_index]
      challenger_character = @game.game_characters.find_by!(user_id: @game.challenger_id)

      challenger_character.update!(character_position_attributes(challenger_position))
      @game.game_characters.create!(character_attributes_for(current_user, challenged_position))

      first_turn_user_id = first_move ? current_user.id : @game.challenger_id
       @game.update!(
         status: :active,
         current_turn_user_id: first_turn_user_id
       )
     end

     broadcast_game_acceptance(@game.reload)

    render json: { data: { game: serialize_game(@game) } }
  rescue GameError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages.presence || [ e.message ] }, status: :unprocessable_entity
  end

  def decline
    return render_forbidden unless challenged_player?
    return render_unprocessable_entity("Game is not pending") unless @game.pending?

    @game.update!(status: :forfeited)

    render json: { data: { game: serialize_game(@game.reload) } }
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages.presence || [ e.message ] }, status: :unprocessable_entity
  end

  def forfeit
    @game = visible_games.includes(:game_characters).find_by(id: params[:id])
    return render_not_found unless @game
    return render_forbidden unless player_in_game?(@game)
    return render_unprocessable_entity("Game is not active") unless @game.active?

     opponent_user_id = @game.game_characters.find { |c| c.user_id != current_user.id }&.user_id

    begin
      @game.with_lock do
        raise ActiveRecord::StaleObjectError unless @game.active?
        @game.update!(status: :forfeited, winner_id: opponent_user_id)
      end
    rescue ActiveRecord::StaleObjectError
      return render json: { errors: [ "Game state changed, please retry" ] }, status: :unprocessable_entity
    end

    xp_awards = GameCompletionService.call(@game)
    Broadcaster.game_over(@game, xp_awards: xp_awards)

    render json: { data: { game: @game.as_json(only: [ :id, :status, :winner_id ]) } }
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages.presence || [ e.message ] }, status: :unprocessable_entity
  end

  def choose_position
    return render_forbidden unless challenger_player?

    starting_position_index = parse_starting_position_index
    return render_unprocessable_entity("starting_position_index must be 0 or 1") unless VALID_STARTING_POSITION_INDICES.include?(starting_position_index)

    @game.with_lock do
      raise GameError, "Game is not accepted" unless @game.accepted?

      start_positions = start_positions_for(@game)
      challenger_position = start_positions[starting_position_index]
      challenged_position = start_positions[1 - starting_position_index]

      challenger_character = @game.game_characters.find_by!(user_id: current_user.id)
      challenger_character.update!(character_position_attributes(challenger_position))

      challenged_user = User.find(@game.challenged_id)
      @game.game_characters.create!(character_attributes_for(challenged_user, challenged_position))

       @game.update!(status: :active)
     end

     broadcast_game_acceptance(@game.reload)

    render json: { data: { game: serialize_game(@game) } }
  rescue GameError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_entity
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages.presence || [ e.message ] }, status: :unprocessable_entity
  end

  def state
    render json: { data: GameStateService.new(@game).snapshot }
  end

  def replay
    return render_forbidden if @game.completed? || @game.forfeited?

    from_turn = params[:from_turn].present? ? Integer(params[:from_turn], exception: false) || 0 : 0
    actions = @game.game_actions.where("turn_number >= ?", from_turn).order(:turn_number, :sequence_number)

    render json: {
      data: {
        game_id: @game.id,
        actions: actions.map { |action| serialize_replay_action(action) }
      }
    }
  end

  private

  def create_params
    params.permit(:challenged_id)
  end

  def visible_games
    Game.where("challenger_id = :user_id OR challenged_id = :user_id", user_id: current_user.id)
  end

   def set_game
     @game = visible_games.includes(:game_characters, :challenger, :challenged).find_by(id: params[:id])
     return if @game

     render json: { errors: [ "Game not found" ] }, status: :not_found
   end

  def challenged_player?
    @game.challenged_id == current_user.id
  end

  def challenger_player?
    @game.challenger_id == current_user.id
  end

   def set_game_for_player!
     @game = Game.includes(:game_characters, :game_actions).find_by(id: params[:id])
    return render_not_found unless @game
    return if player_in_game?(@game)

    render_forbidden
  end

  def player_in_game?(game)
    game.challenger_id == current_user.id || game.challenged_id == current_user.id
  end

  def parse_starting_position_index
    Integer(params[:starting_position_index], exception: false)
  end

  def accept_first_move
    @game.with_lock do
      raise GameError, "Game is not pending" unless @game.pending?

      @game.update!(status: :accepted, current_turn_user_id: current_user.id)
    end

    Broadcaster.position_pick_needed(@game.challenger, @game)

    render json: { data: { game: serialize_game(@game.reload) } }
  end

  def friends?(first_user, second_user)
    Friendship.accepted.exists?(requester: first_user, recipient: second_user) ||
      Friendship.accepted.exists?(requester: second_user, recipient: first_user)
  end

  def active_or_pending_game_exists?(first_user, second_user)
    Game.where(status: VISIBLE_STATUSES)
      .where(
        "(challenger_id = :first_id AND challenged_id = :second_id) OR (challenger_id = :second_id AND challenged_id = :first_id)",
        first_id: first_user.id,
        second_id: second_user.id
      )
      .exists?
  end

  def start_positions_for(game)
    game.board_config.with_indifferent_access[:start_positions]
  end

  def character_attributes_for(user, position)
    character_position_attributes(position).merge(
      user: user,
      max_hp: 10,
      current_hp: 10,
      is_defending: false,
      stats: {}
    )
  end

  def character_position_attributes(position)
    x, y = position[0], position[1]
    facing = y > 1 ? { x: x, y: y - 1 } : { x: x, y: y + 1 }
    {
      position: position_hash(position),
      facing_tile: facing
    }
  end

  def position_hash(position)
    {
      x: position[0],
      y: position[1]
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
         characters: game.game_characters.order(:id).map { |character| serialize_character(character) }
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
      stats: character.stats
    }
  end

  def serialize_replay_action(action)
    {
      id: action.id,
      action_type: action.action_type,
      action_data: action.action_data,
      result_data: action.result_data,
      turn_number: action.turn_number,
      sequence_number: action.sequence_number,
       game_character_id: action.game_character_id,
      created_at: action.created_at.iso8601
    }
  end

  def broadcast_game_invitation(challenged_user, game)
    NotificationChannel.broadcast_to(challenged_user, { event: "game_invitation_received", game_id: game.id })
  rescue NameError
    nil
  end

  def broadcast_game_acceptance(game)
    GameChannel.broadcast_to(game, { event: "game_accepted", game_id: game.id })
  rescue NameError
    nil
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
