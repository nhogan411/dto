class GameStateService
  def initialize(game)
    @game = game
  end

  def snapshot
    acting = game.acting_character
    {
      game_id: game.id,
      status: game.status,
      challenger_id: game.challenger_id,
      challenged_id: game.challenged_id,
      current_turn_user_id: game.current_turn_user_id,
      turn_order: game.turn_order,
      current_turn_index: game.current_turn_index,
      acting_character_id: acting&.id,
      turn_deadline: game.turn_deadline&.iso8601,
      winner_id: game.winner_id,
      turn_number: game.game_actions.where(action_type: :end_turn).count + 1,
      board_config: game.board_config,
      acting_character_actions: acting_character_turn_actions,
      characters: game.characters.map { |character| character_snapshot(character) },
      last_action: game.game_actions.order(:turn_number, :sequence_number).last&.as_json
    }
  end

  private

  attr_reader :game

  def acting_character_turn_actions
    actor = game.acting_character
    return nil unless actor

    current_turn_number = game.game_actions.where(action_type: :end_turn).count + 1
    actions_in_turn = game.game_actions.where(turn_number: current_turn_number, character_id: actor.id)
    moves_taken = actions_in_turn.where(action_type: :move).sum("jsonb_array_length(action_data->'path')")

    {
      has_moved: actions_in_turn.where(action_type: :move).exists?,
      has_attacked: actions_in_turn.where(action_type: :attack).exists?,
      has_defended: actions_in_turn.where(action_type: :defend).exists?,
      moves_taken: moves_taken
    }
  end

  def character_snapshot(character)
    {
      id: character.id,
      user_id: character.user_id,
      position: character.position,
      facing_tile: character.facing_tile,
      current_hp: character.current_hp,
      max_hp: character.max_hp,
      is_defending: character.is_defending,
      stats: character.stats,
      alive: character.alive?,
      icon: character.icon
    }
  end
end
