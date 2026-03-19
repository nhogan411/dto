require "rails_helper"

RSpec.describe InviteExpiryJob, type: :job do
  include ActiveSupport::Testing::TimeHelpers

  describe "#perform" do
    let!(:challenger) { create(:user, email: "invite-a@example.com", username: "invite_a") }
    let!(:challenged) { create(:user, email: "invite-b@example.com", username: "invite_b") }

    before do
      Notification.delete_all
    end

    it "declines expired pending games and notifies both players" do
      game = create(
        :game,
        challenger: challenger,
        challenged: challenged,
        status: :pending,
        expires_at: 5.minutes.ago
      )

      expect(Broadcaster).to receive(:invite_expired).twice do |user, notification|
        expect([ challenger, challenged ]).to include(user)
        expect(notification.user).to eq(user)
        expect(notification.event).to eq("invite_expired")
        expect(notification.data).to eq("game_id" => game.id)
      end

      described_class.perform_now

      game.reload
      notifications = Notification.where(event: "invite_expired").order(:user_id)

      expect(game.status).to eq("declined")
      expect(notifications.pluck(:user_id)).to eq([ challenger.id, challenged.id ])
      expect(notifications.pluck(:data)).to all(eq("game_id" => game.id))
    end

    it "does not change non-expired or non-pending games" do
      future_game = create(:game, challenger: challenger, challenged: challenged, status: :pending, expires_at: 10.minutes.from_now)
      accepted_game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, expires_at: 5.minutes.ago)

      expect(Broadcaster).not_to receive(:invite_expired)

      described_class.perform_now

      expect(future_game.reload.status).to eq("pending")
      expect(accepted_game.reload.status).to eq("accepted")
      expect(Notification.count).to eq(0)
    end

    it "skips games without expires_at" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending, expires_at: nil)

      described_class.perform_now

      expect(game.reload.status).to eq("pending")
      expect(Notification.count).to eq(0)
    end
  end
end
