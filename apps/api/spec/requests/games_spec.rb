require "rails_helper"

RSpec.describe "Games", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  describe "POST /games" do
    let(:challenger) { create(:user) }
    let(:challenged) { create(:user) }
    let(:headers) { auth_headers(challenger) }

    it "creates a pending game for friends with generated board config" do
      create(:friendship, requester: challenger, recipient: challenged, status: :accepted)

      post "/games", params: { challenged_id: challenged.id, turn_time_limit: 3600 }, headers: headers

      expect(response).to have_http_status(:created)

      game = Game.order(:created_at).last
      challenger_character = game.characters.find_by!(user_id: challenger.id)
      board_config = game.board_config.with_indifferent_access

      expect(game.challenger_id).to eq(challenger.id)
      expect(game.challenged_id).to eq(challenged.id)
      expect(game.status).to eq("pending")
      expect(board_config[:blocked_squares].size).to eq(16)
      expect(board_config[:start_positions].size).to eq(2)
      expect(challenger_character.position).to eq(position_hash(board_config[:start_positions].first))
      pos = board_config[:start_positions].first
      expected_facing = pos[1] > 1 ? { "x" => pos[0], "y" => pos[1] - 1 } : { "x" => pos[0], "y" => pos[1] + 1 }
      expect(challenger_character.facing_tile).to eq(expected_facing)

      body = json_response
      expect(body.dig("data", "game", "id")).to eq(game.id)
      expect(body.dig("data", "game", "status")).to eq("pending")
      expect(body.dig("data", "game", "board_config", "blocked_squares").size).to eq(16)
      expect(body.dig("data", "game", "board_config", "start_positions").size).to eq(2)
    end

    it "returns 422 when the challenged user is not a friend" do
      post "/games", params: { challenged_id: challenged.id, turn_time_limit: 3600 }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors").join(" ")).to include("must be friends")
    end

    it "returns 422 when an active or pending game already exists for the pair" do
      create(:friendship, requester: challenger, recipient: challenged, status: :accepted)
      create(:game, challenger: challenger, challenged: challenged, status: :pending)

      post "/games", params: { challenged_id: challenged.id, turn_time_limit: 3600 }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors").join(" ")).to include("already exists")
    end
  end

  describe "GET /games" do
    let(:user) { create(:user) }
    let(:other_user) { create(:user) }
    let(:headers) { auth_headers(user) }

   it "returns the current user's pending and active games" do
     pending_game = create(:game, challenger: user, challenged: other_user, status: :pending)
     active_game = create(:game, challenger: other_user, challenged: user, status: :active)
     create(:game, challenger: user, challenged: other_user, status: :completed)
     create(:game)

     get "/games", headers: headers

     expect(response).to have_http_status(:ok)

     returned_ids = json_response.dig("data", "games").map { |game| game.fetch("id") }

     expect(returned_ids).to contain_exactly(pending_game.id, active_game.id)
   end

   it "returns challenger and challenged usernames in game list" do
     create(:game, challenger: user, challenged: other_user, status: :pending)

     get "/games", headers: headers

     expect(response).to have_http_status(:ok)
     first_game = json_response.dig("data", "games").first
     expect(first_game["challenger_username"]).to eq(user.username)
     expect(first_game["challenged_username"]).to eq(other_user.username)
   end
  end

  describe "GET /games/:id" do
    let(:user) { create(:user) }
    let(:other_user) { create(:user) }
    let(:headers) { auth_headers(user) }

   it "returns game info for a visible game" do
     game = create(:game, challenger: user, challenged: other_user, status: :pending)

     get "/games/#{game.id}", headers: headers

     expect(response).to have_http_status(:ok)
     expect(json_response.dig("data", "game", "id")).to eq(game.id)
     expect(json_response.dig("data", "game", "challenger_id")).to eq(user.id)
     expect(json_response.dig("data", "game", "status")).to eq("pending")
   end

   it "returns challenger and challenged usernames" do
     game = create(:game, challenger: user, challenged: other_user, status: :pending)

     get "/games/#{game.id}", headers: headers

     expect(response).to have_http_status(:ok)
     expect(json_response.dig("data", "game", "challenger_username")).to eq(user.username)
     expect(json_response.dig("data", "game", "challenged_username")).to eq(other_user.username)
   end
  end

  describe "PATCH /games/:id/accept" do
    let(:challenger) { create(:user) }
    let(:challenged) { create(:user) }
    let(:headers) { auth_headers(challenged) }
    let(:board_config) { { blocked_squares: [], start_positions: [ [ 1, 1 ], [ 8, 8 ] ] } }

    it "activates the game, assigns characters, and sets the turn deadline" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      travel_to Time.zone.parse("2026-03-14 12:00:00") do
        patch "/games/#{game.id}/accept", params: { starting_position_index: 0 }, headers: headers

        expect(response).to have_http_status(:ok)

        game.reload
        challenger_character = game.characters.find_by!(user_id: challenger.id)
        challenged_character = game.characters.find_by!(user_id: challenged.id)

        expect(game.status).to eq("active")
        expect(game.current_turn_user_id).to eq(challenger.id)
        expect(game.turn_deadline).to eq(Time.current + 3600.seconds)
        expect(challenger_character.position).to eq({ "x" => 8, "y" => 8 })
        expect(challenger_character.facing_tile).to eq({ "x" => 8, "y" => 7 })
        expect(challenged_character.position).to eq({ "x" => 1, "y" => 1 })
        expect(challenged_character.facing_tile).to eq({ "x" => 1, "y" => 2 })
        expect(json_response.dig("data", "game", "status")).to eq("active")
      end
    end

    it "gives first move to the challenged player when first_move is true" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      travel_to Time.zone.parse("2026-03-14 12:00:00") do
        patch "/games/#{game.id}/accept", params: { starting_position_index: 0, first_move: true }, headers: headers

        expect(response).to have_http_status(:ok)

        game.reload
        expect(game.status).to eq("active")
        expect(game.current_turn_user_id).to eq(challenged.id)
      end
    end

    it "accepts into accepted status when first_move is true without starting position" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      expect(Broadcaster).to receive(:position_pick_needed).with(challenger, game)

      patch "/games/#{game.id}/accept", params: { first_move: true }, headers: headers

      expect(response).to have_http_status(:ok)

      game.reload
      expect(game.status).to eq("accepted")
      expect(game.current_turn_user_id).to eq(challenged.id)
      expect(game.turn_deadline).to be_nil
      expect(game.characters.count).to eq(1)
      expect(game.characters.exists?(user_id: challenged.id)).to be(false)
    end

    it "returns 422 when first_move accept is attempted for a non-pending game" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/accept", params: { first_move: true }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("Game is not pending")
    end

    it "returns 422 when starting_position_index is missing and first_move is not true" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/accept", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("starting_position_index must be 0 or 1")
    end
  end

  describe "PATCH /games/:id/decline" do
    let(:challenger) { create(:user) }
    let(:challenged) { create(:user) }
    let(:headers) { auth_headers(challenged) }

    it "forfeits the pending game" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending)

      patch "/games/#{game.id}/decline", headers: headers

      expect(response).to have_http_status(:ok)
      expect(game.reload.status).to eq("forfeited")
      expect(json_response.dig("data", "game", "status")).to eq("forfeited")
    end
  end

  describe "PATCH /games/:id/choose_position" do
    let(:challenger) { create(:user) }
    let(:challenged) { create(:user) }
    let(:headers) { auth_headers(challenger) }
    let(:board_config) { { blocked_squares: [], start_positions: [ [ 1, 1 ], [ 8, 8 ] ] } }

    it "activates an accepted game when challenger chooses position index 0" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      travel_to Time.zone.parse("2026-03-14 12:00:00") do
        expect {
          patch "/games/#{game.id}/choose_position", params: { starting_position_index: 0 }, headers: headers
        }.to have_enqueued_job(TurnTimeoutJob).with(game.id, (Time.current + 3600.seconds).iso8601)

        expect(response).to have_http_status(:ok)

        game.reload
        challenger_character = game.characters.find_by!(user_id: challenger.id)
        challenged_character = game.characters.find_by!(user_id: challenged.id)

        expect(game.status).to eq("active")
        expect(game.current_turn_user_id).to eq(challenged.id)
        expect(game.turn_deadline).to eq(Time.current + 3600.seconds)
        expect(challenger_character.position).to eq({ "x" => 1, "y" => 1 })
        expect(challenged_character.position).to eq({ "x" => 8, "y" => 8 })
        expect(json_response.dig("data", "game", "status")).to eq("active")
        expect(json_response.dig("data", "game", "current_turn_user_id")).to eq(challenged.id)
      end
    end

    it "assigns opposite positions when challenger chooses position index 1" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", params: { starting_position_index: 1 }, headers: headers

      expect(response).to have_http_status(:ok)

      game.reload
      challenger_character = game.characters.find_by!(user_id: challenger.id)
      challenged_character = game.characters.find_by!(user_id: challenged.id)

      expect(challenger_character.position).to eq({ "x" => 8, "y" => 8 })
      expect(challenged_character.position).to eq({ "x" => 1, "y" => 1 })
    end

    it "returns 403 when challenged player attempts to choose a position" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", params: { starting_position_index: 0 }, headers: auth_headers(challenged)

      expect(response).to have_http_status(:forbidden)
      expect(json_response.fetch("errors")).to include("Forbidden")
    end

    it "returns 404 when a random user attempts to choose a position" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", params: { starting_position_index: 0 }, headers: auth_headers(create(:user))

      expect(response).to have_http_status(:not_found)
      expect(json_response.fetch("errors")).to include("Game not found")
    end

    it "returns 422 when game is pending" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :pending, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", params: { starting_position_index: 0 }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("Game is not accepted")
    end

    it "returns 422 when game is active" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :active, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", params: { starting_position_index: 0 }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("Game is not accepted")
    end

    it "returns 422 when starting_position_index is missing" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("starting_position_index must be 0 or 1")
    end

    it "returns 422 when starting_position_index is not 0 or 1" do
      game = create(:game, challenger: challenger, challenged: challenged, status: :accepted, current_turn_user_id: challenged.id, turn_time_limit: 3600, board_config: board_config)
      create(:character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 1 })

      patch "/games/#{game.id}/choose_position", params: { starting_position_index: 2 }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("starting_position_index must be 0 or 1")
    end
  end

  def auth_headers(user)
    {
      "Authorization" => "Bearer #{JsonWebToken.encode(user_id: user.id)}"
    }
  end

  def json_response
    JSON.parse(response.body)
  end

  def position_hash(position)
    {
      "x" => position[0],
      "y" => position[1]
    }
  end
end
