class Broadcaster
  def self.game_action_completed(game, action)
    broadcast_to_game(game, { event: "action_completed", game_id: game.id, data: { game_state: GameStateService.new(game).snapshot, action: action.as_json } })
  end

  def self.turn_changed(game)
    broadcast_to_game(game, { event: "turn_changed", game_id: game.id, current_turn_user_id: game.current_turn_user_id })
  end

  def self.game_over(game)
    broadcast_to_game(game, { event: "game_over", game_id: game.id, winner_id: game.winner_id, status: game.status })
  end

  def self.game_updated(game, data = {})
    broadcast_to_game(game, { event: "game_updated", game_id: game.id }.merge(data))
  end

  def self.friend_request_received(user, from_user)
    broadcast_to_user(user, { event: "friend_request_received", from_user_id: from_user.id, from_username: from_user.username })
  end

  def self.friend_request_accepted(user, by_user)
    broadcast_to_user(user, { event: "friend_request_accepted", by_user_id: by_user.id, by_username: by_user.username })
  end

  def self.game_invitation_received(user, game)
    broadcast_to_user(user, { event: "game_invitation_received", game_id: game.id })
  end

  def self.invite_expired(user, notification)
    broadcast_to_user(
      user,
      {
        event: "invite_expired",
        notification_id: notification.id,
        game_id: notification.data["game_id"] || notification.data[:game_id],
        data: notification.data
      }
    )
  end

  def self.your_turn(user, game)
    broadcast_to_user(user, { event: "your_turn", game_id: game.id })
  end

  def self.position_pick_needed(user, game)
    broadcast_to_user(user, { event: "position_pick_needed", game_id: game.id })
  end

  private_class_method def self.broadcast_to_game(game, data)
    ActionCable.server.broadcast(GameChannel.broadcasting_for(game), data)
  end

  private_class_method def self.broadcast_to_user(user, data)
    ActionCable.server.broadcast(NotificationChannel.broadcasting_for(user), data)
  end
end
