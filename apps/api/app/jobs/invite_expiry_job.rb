class InviteExpiryJob < ApplicationJob
  queue_as :default

  def perform
    Game.pending.where.not(expires_at: nil).where("expires_at < ?", Time.current).find_each do |game|
      expire_game(game)
    end
  end

  private

  def expire_game(game)
    notifications = []

    game.with_lock do
      return unless game.pending?
      return if game.expires_at.nil?
      return if game.expires_at >= Time.current

      game.update!(status: :declined)

      notifications = [ game.challenger, game.challenged ].map do |user|
        Notification.create!(user: user, event: "invite_expired", data: { game_id: game.id })
      end
    end

    notifications.each do |notification|
      Broadcaster.invite_expired(notification.user, notification)
    end
  end
end
