require "rails_helper"

RSpec.describe "GameState", type: :request do
  let(:challenger) { create(:user) }
  let(:challenged) { create(:user) }
  let(:outsider) { create(:user) }
  let(:headers) { auth_headers(challenger) }
  let(:board_config) { { blocked_squares: [ [ 3, 3 ] ], start_positions: [ [ 1, 1 ], [ 8, 8 ] ] } }
  let(:game) do
    create(
      :game,
      challenger: challenger,
      challenged: challenged,
      status: :active,
      current_turn_user: challenged,
      board_config: board_config,
      winner_id: challenged.id
    )
  end
   let!(:challenger_character) do
     create(
       :game_character,
       game: game,
       user: challenger,
       position: { x: 1, y: 1 },
       facing_tile: { x: 1, y: 2 },
       current_hp: 8,
       max_hp: 10,
       is_defending: true
     )
   end
   let!(:challenged_character) do
     create(
       :game_character,
       game: game,
       user: challenged,
       position: { x: 8, y: 8 },
       facing_tile: { x: 8, y: 7 },
       current_hp: 10,
       max_hp: 10,
       is_defending: false
     )
   end

  describe "GET /games/:id/state" do
    it "returns the current game snapshot for an authenticated player" do
      get "/games/#{game.id}/state", headers: headers

      expect(response).to have_http_status(:ok)

      snapshot = json_response.fetch("data")

      expect(snapshot).to include(
        "game_id" => game.id,
        "status" => "active",
        "current_turn_user_id" => challenged.id,
        "winner_id" => challenged.id,
        "board_config" => board_config.stringify_keys
      )

      expect(snapshot.fetch("characters")).to contain_exactly(
        a_hash_including(
          "id" => challenger_character.id,
          "user_id" => challenger.id,
          "position" => challenger_character.position.stringify_keys,
          "facing_tile" => challenger_character.facing_tile.stringify_keys,
          "current_hp" => 8,
          "max_hp" => 10,
          "is_defending" => true
        ),
        a_hash_including(
          "id" => challenged_character.id,
          "user_id" => challenged.id,
          "position" => challenged_character.position.stringify_keys,
          "facing_tile" => challenged_character.facing_tile.stringify_keys,
          "current_hp" => 10,
          "max_hp" => 10,
          "is_defending" => false
        )
      )
    end

    it "returns 401 for an unauthenticated request" do
      get "/games/#{game.id}/state"

      expect(response).to have_http_status(:unauthorized)
      expect(json_response.fetch("errors")).to include("Unauthorized")
    end

    it "returns 403 for a non-player" do
      get "/games/#{game.id}/state", headers: auth_headers(outsider)

      expect(response).to have_http_status(:forbidden)
      expect(json_response.fetch("errors")).to include("Forbidden")
    end
  end

  describe "GET /games/:id/replay" do
    let!(:late_turn_one_action) do
      create(:game_action, game: game, game_character: challenger_character, action_type: :end_turn, turn_number: 1, sequence_number: 2)
    end
    let!(:early_turn_one_action) do
      create(:game_action, game: game, game_character: challenger_character, action_type: :move, turn_number: 1, sequence_number: 1, action_data: { path: [ { x: 2, y: 1 } ] })
    end
    let!(:turn_two_action) do
      create(:game_action, game: game, game_character: challenged_character, action_type: :attack, turn_number: 2, sequence_number: 1, action_data: { target_character_id: challenger_character.id }, result_data: { damage: 1 })
    end

    it "returns the ordered actions list for replay" do
      get "/games/#{game.id}/replay", headers: headers

      expect(response).to have_http_status(:ok)

      body = json_response.fetch("data")
      actions = body.fetch("actions")

      expect(body.fetch("game_id")).to eq(game.id)
      expect(actions.map { |action| [ action.fetch("id"), action.fetch("turn_number"), action.fetch("sequence_number") ] }).to eq([
        [ early_turn_one_action.id, 1, 1 ],
        [ late_turn_one_action.id, 1, 2 ],
        [ turn_two_action.id, 2, 1 ]
      ])

      expect(actions.first).to include(
        "id" => early_turn_one_action.id,
        "action_type" => "move",
        "action_data" => early_turn_one_action.action_data.stringify_keys,
        "result_data" => early_turn_one_action.result_data.stringify_keys,
        "turn_number" => 1,
        "sequence_number" => 1,
        "game_character_id" => challenger_character.id,
        "created_at" => early_turn_one_action.created_at.iso8601
      )
    end

    it "returns 401 for an unauthenticated request" do
      get "/games/#{game.id}/replay"

      expect(response).to have_http_status(:unauthorized)
      expect(json_response.fetch("errors")).to include("Unauthorized")
    end

    it "returns 403 for a completed game" do
      completed_game = create(:game, challenger: challenger, challenged: challenged, status: :completed)
      get "/games/#{completed_game.id}/replay", headers: auth_headers(challenger)

      expect(response).to have_http_status(:forbidden)
    end

    it "returns 403 for a forfeited game" do
      forfeited_game = create(:game, challenger: challenger, challenged: challenged, status: :forfeited)
      get "/games/#{forfeited_game.id}/replay", headers: auth_headers(challenger)

      expect(response).to have_http_status(:forbidden)
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
end
