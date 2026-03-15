require "rails_helper"

RSpec.describe "GameActions", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:challenger) { create(:user) }
  let(:challenged) { create(:user) }
  let(:board_config) { { blocked_squares: [], start_positions: [ [ 1, 1 ], [ 8, 8 ] ] } }
  let(:game) do
    create(
      :game,
      challenger: challenger,
      challenged: challenged,
      status: :active,
      current_turn_user: challenger,
      turn_time_limit: 3600,
      turn_deadline: Time.current + 1.hour,
      board_config: board_config
    )
  end
  let!(:challenger_character) do
    create(:character, game: game, user: challenger, position: { x: 2, y: 2 }, facing_tile: { x: 2, y: 3 }, current_hp: 10)
  end
  let!(:challenged_character) do
    create(:character, game: game, user: challenged, position: { x: 2, y: 3 }, facing_tile: { x: 2, y: 2 }, current_hp: 10)
  end
  let(:challenger_headers) { auth_headers(challenger) }
  let(:challenged_headers) { auth_headers(challenged) }

  describe "POST /games/:id/actions" do
    it "accepts a valid move, updates position, and broadcasts action_completed" do
      expected_turn_number = 1
      expected_sequence_number = 1

      expect(ActionCable.server).to receive(:broadcast) do |stream, payload|
        expect(stream).to eq(GameChannel.broadcasting_for(game))
        expect(payload[:event]).to eq("action_completed")
        expect(payload[:game_id]).to eq(game.id)
        expect(payload[:data]["from_position"]).to eq({ "x" => 2, "y" => 2 })
        expect(payload[:data]["to_position"]).to eq({ "x" => "3", "y" => "2" })
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
      game.update!(board_config: { blocked_squares: [ [ 3, 2 ] ], start_positions: [ [ 1, 1 ], [ 8, 8 ] ] })

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
            rand_val: 0.01
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
      expect(result["success_rate"]).to eq(0.5)
      expect(challenged_character.reload.current_hp).to eq(3)
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
            action_data: {}
          },
          headers: challenger_headers

        expect(response).to have_http_status(:ok)
        game.reload

        expect(game.current_turn_user_id).to eq(challenged.id)
        expect(game.turn_deadline).to eq(Time.current + game.turn_time_limit.seconds)
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

        expect(game.current_turn_user_id).to eq(challenged.id)
        expect(game.turn_deadline).to eq(Time.current + game.turn_time_limit.seconds)
      end
    end

    it "completes game when attack reduces target hp to 0" do
      challenged_character.update!(current_hp: 1)

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

      game.reload
      expect(game.status).to eq("completed")
      expect(game.winner_id).to eq(challenger.id)
      expect(challenged_character.reload.current_hp).to eq(0)
    end
  end

  describe "GET /games/:id/actions" do
    it "returns all game actions ordered by turn and sequence" do
      create(:game_action, game: game, character: challenger_character, action_type: :move, turn_number: 1, sequence_number: 2)
      create(:game_action, game: game, character: challenger_character, action_type: :end_turn, turn_number: 1, sequence_number: 3)
      create(:game_action, game: game, character: challenged_character, action_type: :move, turn_number: 2, sequence_number: 1)

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
