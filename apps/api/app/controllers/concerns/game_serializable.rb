module GameSerializable
  extend ActiveSupport::Concern

  private

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
      stats: character.stats,
      icon: character.icon,
      race: character.stats["race"]
    }
  end
end
