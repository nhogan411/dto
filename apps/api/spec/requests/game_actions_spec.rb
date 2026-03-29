require "rails_helper"

RSpec.describe "GameActions", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:challenger) { create(:user) }
  let(:challenged) { create(:user) }
  let(:board_config) { { start_positions: [ [ 1, 1 ], [ 8, 8 ] ], tiles: create(:game).board_config["tiles"] } }
  let(:game) do
    create(
      :game,
      challenger: challenger,
      challenged: challenged,
      status: :active,
      current_turn_user: challenger,
      board_config: board_config
    )
  end
  let!(:challenger_character) do
    create(:game_character, game: game, user: challenger, position: { x: 2, y: 2 }, facing_tile: { x: 2, y: 3 }, current_hp: 10)
  end
  let!(:challenged_character) do
    create(:game_character, game: game, user: challenged, position: { x: 2, y: 3 }, facing_tile: { x: 2, y: 2 }, current_hp: 10)
  end
  let(:challenger_headers) { auth_headers(challenger) }
  let(:challenged_headers) { auth_headers(challenged) }

  before do
    game.update!(turn_order: [ challenger_character.id, challenged_character.id ], current_turn_index: 0)
  end

  describe "POST /games/:id/actions" do
    it "accepts a valid move, updates position, and broadcasts action_completed" do
      expected_turn_number = 1
      expected_sequence_number = 1

      expect(ActionCable.server).to receive(:broadcast) do |stream, payload|
        expect(stream).to eq(GameChannel.broadcasting_for(game))
        expect(payload[:event]).to eq("action_completed")
        expect(payload[:game_id]).to eq(game.id)
        expect(payload[:data][:game_state]).to be_a(Hash)
        expect(payload[:data][:game_state]).to include(:game_id, :status, :characters)
        expect(payload[:data][:action]["result_data"]["from_position"]).to eq({ "x" => 2, "y" => 2 })
        expect(payload[:data][:action]["result_data"]["to_position"]).to eq({ "x" => "3", "y" => "2" })
      end

      post "/games/#{game.id}/actions",
        params: {
          action_type: :move,
          action_data: {
            path: [ { x: 3, y: 2 } ]
          }
        },
        headers: challenger_headers

      expect(response).to have_http_status(:ok)
      expect(challenger_character.reload.position).to eq({ "x" => "3", "y" => "2" })

      action = GameAction.order(:created_at).last
      expect(action.action_type).to eq("move")
      expect(action.turn_number).to eq(expected_turn_number)
      expect(action.sequence_number).to eq(expected_sequence_number)
    end

     it "rejects move into blocked square with 422" do
       base_tiles = create(:game).board_config["tiles"]
       base_tiles[1][2] = { "type" => "blocked" }
       game.update!(board_config: { start_positions: [ [ 1, 1 ], [ 8, 8 ] ], tiles: base_tiles })

      post "/games/#{game.id}/actions",
        params: {
          action_type: :move,
          action_data: {
            path: [ { x: 3, y: 2 } ]
          }
        },
        headers: challenger_headers

      expect(response).to have_http_status(422)
      expect(json_response.fetch("errors").join(" ")).to include("blocked squares")
    end

    it "rejects move longer than 3 squares with 422" do
      post "/games/#{game.id}/actions",
        params: {
          action_type: :move,
          action_data: {
            path: [
              { x: 3, y: 2 },
              { x: 4, y: 2 },
              { x: 5, y: 2 },
              { x: 6, y: 2 }
            ]
          }
        },
        headers: challenger_headers

      expect(response).to have_http_status(422)
      expect(json_response.fetch("errors").join(" ")).to include("1 to 3")
    end

    it "resolves attack deterministically with rand_val" do
      challenger_character.update!(position: { x: 2, y: 2 }, facing_tile: { x: 2, y: 3 })
      challenged_character.update!(position: { x: 2, y: 3 }, facing_tile: { x: 2, y: 2 }, current_hp: 5, is_defending: false)

      post "/games/#{game.id}/actions",
        params: {
          action_type: :attack,
          action_data: {
            target_character_id: challenged_character.id,
            rand_val: 20
          }
        },
        headers: challenger_headers

      expect(response).to have_http_status(:ok)

      body = json_response
      result = body.dig("data", "action", "result_data")

      expect(result).to include(
        "hit" => true,
        "critical" => true,
        "damage" => 2,
        "target_id" => challenged_character.id,
        "target_hp_remaining" => 3
      )
      expect(result["roll"]).to eq(20)
      expect(result["threshold"]).to eq(12)
      expect(result["direction"]).to eq("front")
      expect(challenged_character.reload.current_hp).to eq(3)
    end

    it "applies +6 to-hit threshold when target is defending" do
      challenged_character.update!(
        position: { x: 2, y: 3 },
        facing_tile: { x: 2, y: 2 },
        is_defending: true,
        current_hp: 10
      )

      post "/games/#{game.id}/actions",
        params: {
          action_type: :attack,
          action_data: {
            target_character_id: challenged_character.id,
            rand_val: 20
          }
        },
        headers: challenger_headers

      expect(response).to have_http_status(:ok)
      result = json_response.dig("data", "action", "result_data")
      expect(result["threshold"]).to eq(14)
    end

    it "rejects second combat action in same turn with 422" do
      post "/games/#{game.id}/actions",
        params: {
          action_type: :attack,
          action_data: {
            target_character_id: challenged_character.id,
            rand_val: 0.01
          }
        },
        headers: challenger_headers
      expect(response).to have_http_status(:ok)

      post "/games/#{game.id}/actions",
        params: {
          action_type: :defend,
          action_data: {}
        },
        headers: challenger_headers

      expect(response).to have_http_status(422)
      expect(json_response.fetch("errors").join(" ")).to include("already attacked")
    end

    it "rejects action when user submits on wrong turn" do
      post "/games/#{game.id}/actions",
        params: {
          action_type: :move,
          action_data: {
            path: [ { x: 2, y: 4 } ]
          }
        },
        headers: challenged_headers

      expect(response).to have_http_status(422)
      expect(json_response.fetch("errors").join(" ")).to include("not your turn")
    end

      it "advances turn on defend action and broadcasts turn_changed" do
        travel_to Time.zone.parse("2026-03-15 12:00:00") do
          expect(ActionCable.server).to receive(:broadcast).at_least(:once)

          post "/games/#{game.id}/actions",
            params: {
              action_type: :defend,
              action_data: { facing_tile: { x: 2, y: 3 } }
            },
            headers: challenger_headers

           expect(response).to have_http_status(:ok)
           game.reload

           expect(game.current_turn_index).to eq(1)
           expect(game.current_turn_user_id).to eq(challenged.id)
          expect(challenger_character.reload.is_defending).to be(true)
        end
      end

     it "advances turn on end_turn action" do
       travel_to Time.zone.parse("2026-03-15 12:00:00") do
         post "/games/#{game.id}/actions",
           params: {
             action_type: :move,
             action_data: {
               path: [ { x: 3, y: 2 } ]
             }
           },
           headers: challenger_headers
         expect(response).to have_http_status(:ok)

         post "/games/#{game.id}/actions",
           params: {
             action_type: :end_turn,
             action_data: {
               facing_tile: { x: 3, y: 3 }
             }
           },
           headers: challenger_headers

          expect(response).to have_http_status(:ok)
          game.reload

          expect(game.current_turn_index).to eq(1)
          expect(json_response.dig("data", "action", "result_data", "next_character_id")).to eq(challenged_character.id)
         expect(game.reload.current_turn_user_id).to eq(challenged.id)
       end
     end

    it "cycles current_turn_user_id correctly across teams on end_turn actions" do
      travel_to Time.zone.parse("2026-03-15 12:00:00") do
        # Turn 1: challenger ends turn → should flip to challenged
        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 3 } } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)
        expect(game.reload.current_turn_user_id).to eq(challenged.id)

        # Turn 2: challenged ends turn → should flip back to challenger
        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 2 } } },
          headers: challenged_headers
        expect(response).to have_http_status(:ok)
        expect(game.reload.current_turn_user_id).to eq(challenger.id)
      end
    end

    context "with four characters in turn order" do
      let(:game) do
        create(
          :game,
          challenger: challenger,
          challenged: challenged,
          status: :active,
          board_config: board_config
        )
      end

      let!(:challenger_character) do
        create(:game_character, game: game, user: challenger, position: { x: 1, y: 1 }, facing_tile: { x: 1, y: 2 }, current_hp: 10)
      end
      let!(:challenged_character) do
        create(:game_character, game: game, user: challenged, position: { x: 8, y: 8 }, facing_tile: { x: 8, y: 7 }, current_hp: 10)
      end
      let!(:challenger_character_two) do
        create(:game_character, game: game, user: challenger, position: { x: 1, y: 4 }, facing_tile: { x: 1, y: 5 }, current_hp: 10)
      end
      let!(:challenged_character_two) do
        create(:game_character, game: game, user: challenged, position: { x: 8, y: 5 }, facing_tile: { x: 8, y: 4 }, current_hp: 10)
      end

      before do
        game.update!(
          turn_order: [
            challenger_character.id,
            challenged_character.id,
            challenger_character_two.id,
            challenged_character_two.id
          ],
          current_turn_index: 0
        )
      end

      it "cycles turn index 0→1→2→3→0 with end_turn actions" do
        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 2, y: 1 } ] } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)

        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 2 } } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)
        expect(game.reload.current_turn_index).to eq(1)

        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 7, y: 8 } ] } },
          headers: challenged_headers
        expect(response).to have_http_status(:ok)

        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 7, y: 7 } } },
          headers: challenged_headers
        expect(response).to have_http_status(:ok)
        expect(game.reload.current_turn_index).to eq(2)

        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 2, y: 4 } ] } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)

        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 5 } } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)
        expect(game.reload.current_turn_index).to eq(3)

        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 7, y: 5 } ] } },
          headers: challenged_headers
        expect(response).to have_http_status(:ok)

        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 7, y: 4 } } },
          headers: challenged_headers
        expect(response).to have_http_status(:ok)
        expect(game.reload.current_turn_index).to eq(0)
      end

      it "rejects out-of-turn action when acting character belongs to other player" do
        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 8, y: 7 } ] } },
          headers: challenged_headers

        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response.fetch("errors").join(" ")).to include("not your turn")
      end

      it "skips dead characters when advancing turn index" do
        challenged_character.update!(current_hp: 0)

        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 2, y: 1 } ] } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)

        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 2 } } },
          headers: challenger_headers

        expect(response).to have_http_status(:ok)
        game.reload

        expect(game.current_turn_index).to eq(2)
        expect(json_response.dig("data", "action", "result_data", "next_character_id")).to eq(challenger_character_two.id)
      end

      it "skips two consecutive dead characters when advancing turn" do
        challenged_character.update!(current_hp: 0)
        challenger_character_two.update!(current_hp: 0)

        post "/games/#{game.id}/actions",
          params: { action_type: :move, action_data: { path: [ { x: 2, y: 1 } ] } },
          headers: challenger_headers
        expect(response).to have_http_status(:ok)

        post "/games/#{game.id}/actions",
          params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 2 } } },
          headers: challenger_headers

        expect(response).to have_http_status(:ok)
        game.reload
        expect(game.current_turn_index).to eq(3)
        expect(json_response.dig("data", "action", "result_data", "next_character_id")).to eq(challenged_character_two.id)
      end
    end

    context "with four characters (2v2)" do
      let!(:challenger_character_two) do
        create(:game_character, game: game, user: challenger, position: { x: 3, y: 2 }, facing_tile: { x: 3, y: 3 }, current_hp: 10)
      end
      let!(:challenged_character_two) do
        create(:game_character, game: game, user: challenged, position: { x: 2, y: 4 }, facing_tile: { x: 2, y: 3 }, current_hp: 10)
      end

      before do
        game.update!(
          turn_order: [ challenger_character.id, challenged_character.id, challenger_character_two.id, challenged_character_two.id ],
          current_turn_index: 0
        )
      end

      it "does not end the game when only one of two opponents is killed" do
        challenged_character.update!(current_hp: 1, position: { x: 2, y: 3 }, facing_tile: { x: 2, y: 2 })

        post "/games/#{game.id}/actions",
          params: {
            action_type: :attack,
            action_data: {
              target_character_id: challenged_character.id,
              rand_val: 20
            }
          },
          headers: challenger_headers

        expect(response).to have_http_status(:ok)
        game.reload
        expect(game.status).to eq("active")
        expect(game.winner_id).to be_nil
        expect(challenged_character.reload.current_hp).to eq(0)
      end
    end

    it "completes game when attack reduces target hp to 0" do
      challenged_character.update!(current_hp: 1)

      post "/games/#{game.id}/actions",
        params: {
          action_type: :attack,
          action_data: {
            target_character_id: challenged_character.id,
            rand_val: 20
          }
        },
        headers: challenger_headers

      expect(response).to have_http_status(:ok)

      game.reload
      expect(game.status).to eq("completed")
      expect(game.winner_id).to eq(challenger.id)
      expect(challenged_character.reload.current_hp).to eq(0)
    end
  end

  describe "GET /games/:id/attack_preview" do
    it "returns preview data for valid opponent target" do
      get "/games/#{game.id}/attack_preview",
        params: { target_character_id: challenged_character.id },
        headers: challenger_headers

      expect(response).to have_http_status(:ok)
      data = json_response.dig("data")
      expect(data["direction"]).to eq("front")
      expect(data["threshold"]).to eq(12)
      expect(data["hit_chance_percent"]).to eq(50)
      expect(data).to have_key("is_defending")
    end

    it "returns 401 without authentication" do
      get "/games/#{game.id}/attack_preview",
        params: { target_character_id: challenged_character.id }

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 422 when targeting own character" do
      get "/games/#{game.id}/attack_preview",
        params: { target_character_id: challenger_character.id },
        headers: challenger_headers

      expect(response).to have_http_status(422)
      expect(json_response.fetch("errors").join(" ")).to include("own character")
    end

    it "returns 422 when target character is dead" do
      challenged_character.update!(current_hp: 0)

      get "/games/#{game.id}/attack_preview",
        params: { target_character_id: challenged_character.id },
        headers: challenger_headers

      expect(response).to have_http_status(422)
      expect(json_response.fetch("errors").join(" ")).to include("not alive")
    end

    it "returns 404 for non-existent game" do
      get "/games/999999/attack_preview",
        params: { target_character_id: challenged_character.id },
        headers: challenger_headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /games/:id/actions" do
    it "returns all game actions ordered by turn and sequence" do
      create(:game_action, game: game, game_character: challenger_character, action_type: :move, turn_number: 1, sequence_number: 2)
      create(:game_action, game: game, game_character: challenger_character, action_type: :end_turn, turn_number: 1, sequence_number: 3)
      create(:game_action, game: game, game_character: challenged_character, action_type: :move, turn_number: 2, sequence_number: 1)

      get "/games/#{game.id}/actions", headers: challenger_headers

      expect(response).to have_http_status(:ok)

      actions = json_response.dig("data", "actions")
      ordering = actions.map { |a| [ a.fetch("turn_number"), a.fetch("sequence_number") ] }
      expect(ordering).to eq([ [ 1, 2 ], [ 1, 3 ], [ 2, 1 ] ])
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
