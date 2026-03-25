require "rails_helper"

RSpec.describe GameChannel, type: :channel do
  def parsed_transmissions
    transmissions.map(&:deep_symbolize_keys)
  end

  describe "#subscribed" do
    let(:user) { create(:user) }

    before do
      stub_connection(current_user: user)
    end

    it "confirms subscription and streams for a game player" do
      game = create(:game, challenger: user)

      subscribe(game_id: game.id)

      expect(subscription).to be_confirmed
      expect(subscription).to have_stream_for(game)
      first_transmission = parsed_transmissions.first
      expect(first_transmission[:event]).to eq("connected")
      expect(first_transmission[:game_id]).to eq(game.id)
      expect(first_transmission[:snapshot]).to be_a(Hash)
    end

    it "rejects subscription when the game is missing" do
      subscribe(game_id: -1)

      expect(subscription).to be_rejected
    end

    it "rejects subscription when the user is not a player in the game" do
      game = create(:game)

      subscribe(game_id: game.id)

      expect(subscription).to be_rejected
    end
  end

  describe "#request_resync" do
    it "transmits a resync event for the current game" do
      user = create(:user)
      game = create(:game, challenger: user)

      stub_connection(current_user: user)
      subscribe(game_id: game.id)

      expect do
        perform :request_resync
      end.to change { parsed_transmissions.size }.by(1)

      last_transmission = parsed_transmissions.last
      expect(last_transmission[:event]).to eq("resync")
      expect(last_transmission[:game_id]).to eq(game.id)
      expect(last_transmission[:snapshot]).to be_a(Hash)
    end
  end
end

RSpec.describe NotificationChannel, type: :channel do
  it "streams notifications for the current user" do
    user = create(:user)

    stub_connection(current_user: user)
    subscribe

    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_for(user)
  end
end

RSpec.describe Broadcaster do
  describe "game broadcasts" do
    let(:challenger) { create(:user) }
    let(:game) { create(:game, challenger:, current_turn_user: challenger, winner: challenger) }

    it "broadcasts completed game actions" do
      character = create(:game_character, game: game, user: challenger)
      action = create(:game_action, game: game, game_character: character, result_data: { "move" => "north" })

      expect(ActionCable.server).to receive(:broadcast) do |stream, payload|
        expect(stream).to eq(GameChannel.broadcasting_for(game))
        expect(payload[:event]).to eq("action_completed")
        expect(payload[:game_id]).to eq(game.id)
        expect(payload[:data]).to include(:game_state, :action)
        expect(payload[:data][:game_state]).to include(:game_id, :status, :current_turn_user_id)
      end

      described_class.game_action_completed(game, action)
    end

     it "broadcasts turn changes" do
       expect(ActionCable.server).to receive(:broadcast).with(
         GameChannel.broadcasting_for(game),
         hash_including(
           event: "turn_changed",
           game_id: game.id,
           current_turn_user_id: challenger.id,
           current_turn_index: game.current_turn_index,
           next_character_id: game.acting_character&.id
         )
       )

       described_class.turn_changed(game)
     end

     it "broadcasts game over events" do
       expect(ActionCable.server).to receive(:broadcast).with(
         GameChannel.broadcasting_for(game),
         {
           event: "game_over",
           game_id: game.id,
           winner_id: challenger.id,
           status: game.status
         }
       )

       described_class.game_over(game)
     end

    it "broadcasts game updates" do
      expect(ActionCable.server).to receive(:broadcast).with(
        GameChannel.broadcasting_for(game),
        {
          event: "game_updated",
          game_id: game.id,
          phase: "combat"
        }
      )

      described_class.game_updated(game, phase: "combat")
    end
  end

  describe "notification broadcasts" do
    let(:user) { create(:user) }
    let(:other_user) { create(:user) }
    let(:game) { create(:game, challenger: other_user, challenged: user) }

    it "broadcasts received friend requests" do
      expect(ActionCable.server).to receive(:broadcast).with(
        NotificationChannel.broadcasting_for(user),
        {
          event: "friend_request_received",
          from_user_id: other_user.id,
          from_username: other_user.username
        }
      )

      described_class.friend_request_received(user, other_user)
    end

    it "broadcasts accepted friend requests" do
      expect(ActionCable.server).to receive(:broadcast).with(
        NotificationChannel.broadcasting_for(user),
        {
          event: "friend_request_accepted",
          by_user_id: other_user.id,
          by_username: other_user.username
        }
      )

      described_class.friend_request_accepted(user, other_user)
    end

    it "broadcasts game invitations" do
      expect(ActionCable.server).to receive(:broadcast).with(
        NotificationChannel.broadcasting_for(user),
        {
          event: "game_invitation_received",
          game_id: game.id
        }
      )

      described_class.game_invitation_received(user, game)
    end

    it "broadcasts your turn notifications" do
      expect(ActionCable.server).to receive(:broadcast).with(
        NotificationChannel.broadcasting_for(user),
        {
          event: "your_turn",
          game_id: game.id
        }
      )

      described_class.your_turn(user, game)
    end
  end
end
