class TurnTimeoutJob < ApplicationJob
  queue_as :default

  def perform(game_id, expected_deadline)
    game = Game.find_by(id: game_id)
    return if game.nil?

    # Game already completed or forfeited
    return unless game.active?

    # Deadline was updated (new job enqueued), this one is stale
    expected_time = expected_deadline.is_a?(String) ? Time.parse(expected_deadline) : expected_deadline
    return if game.turn_deadline.to_i != expected_time.to_i

    # Not expired yet (shouldn't happen but guard)
    return if game.turn_deadline > Time.current

    # Forfeit the game
    forfeit_game(game)
  end

  private

  def forfeit_game(game)
    current_player = game.current_turn_user
    opponent = game.characters.find { |c| c.user_id != current_player.id }

    game.update!(
      status: :forfeited,
      winner_id: opponent.user_id
    )

    Broadcaster.game_over(game)
  end
end
