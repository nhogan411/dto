require "rails_helper"

describe TurnTimeoutJob, type: :job do
  let!(:user_a) { create(:user, email: "a@example.com", username: "user_a") }
  let!(:user_b) { create(:user, email: "b@example.com", username: "user_b") }
  let!(:game) do
    game = create(
      :game,
      challenger: user_a,
      challenged: user_b,
      status: :active,
      current_turn_user_id: user_a.id,
      turn_time_limit: 3600
    )
    create(:character, game: game, user: user_a)
    create(:character, game: game, user: user_b)
    game.update!(turn_deadline: Time.current + 3600.seconds)
    game
  end

  describe "#perform" do
    context "when game is expired and deadline matches" do
      it "forfeits the game to the opponent" do
        expired_deadline = Time.current - 60.seconds
        game.update!(turn_deadline: expired_deadline)

        TurnTimeoutJob.perform_now(game.id, expired_deadline.iso8601)

        game.reload
        expect(game.status).to eq("forfeited")
        expect(game.winner_id).to eq(user_b.id)
      end

      it "broadcasts game_over event" do
        expired_deadline = Time.current - 60.seconds
        game.update!(turn_deadline: expired_deadline)

        expect(Broadcaster).to receive(:game_over).with(game)
        TurnTimeoutJob.perform_now(game.id, expired_deadline.iso8601)
      end
    end

    context "when deadline has been updated (stale job)" do
      it "does not change the game" do
        old_deadline = Time.current - 60.seconds
        new_deadline = Time.current + 3600.seconds
        game.update!(turn_deadline: new_deadline)

        TurnTimeoutJob.perform_now(game.id, old_deadline.iso8601)

        game.reload
        expect(game.status).to eq("active")
        expect(game.winner_id).to be_nil
      end
    end

    context "when game is already completed" do
      it "does not change the game" do
        completed_game = create(
          :game,
          challenger: user_a,
          challenged: user_b,
          status: :completed,
          winner_id: user_a.id,
          current_turn_user_id: user_a.id,
          turn_time_limit: 3600
        )
        create(:character, game: completed_game, user: user_a)
        create(:character, game: completed_game, user: user_b)
        expired_deadline = Time.current - 60.seconds
        completed_game.update!(turn_deadline: expired_deadline)

        TurnTimeoutJob.perform_now(completed_game.id, expired_deadline.iso8601)

        completed_game.reload
        expect(completed_game.status).to eq("completed")
        expect(completed_game.winner_id).to eq(user_a.id)
      end
    end

    context "when game does not exist" do
      it "returns gracefully" do
        expect {
          TurnTimeoutJob.perform_now(999_999, Time.current.iso8601)
        }.not_to raise_error
      end
    end

    context "when deadline has not expired" do
      it "does not change the game" do
        future_deadline = Time.current + 3600.seconds
        game.update!(turn_deadline: future_deadline)

        TurnTimeoutJob.perform_now(game.id, future_deadline.iso8601)

        game.reload
        expect(game.status).to eq("active")
        expect(game.winner_id).to be_nil
      end
    end
  end
end
