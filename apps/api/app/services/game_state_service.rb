class GameStateService
  def initialize(game)
    @game = game
  end

  def snapshot
    {
      game_id: game.id,
      status: game.status,
      current_turn_user_id: game.current_turn_user_id,
      turn_deadline: game.turn_deadline&.iso8601,
      winner_id: game.winner_id,
      turn_number: game.game_actions.where(action_type: :end_turn).count + 1,
      board_config: game.board_config,
      characters: game.characters.map { |character| character_snapshot(character) },
      last_action: game.game_actions.order(:turn_number, :sequence_number).last&.as_json
    }
  end

  private

  attr_reader :game

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
      alive: character.alive?
    }
  end
end
