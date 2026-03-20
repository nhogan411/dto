require "rails_helper"

RSpec.describe "CharacterSelections", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  describe "POST /games/:id/select_characters" do
    let(:challenger) { create(:user) }
    let(:challenged) { create(:user) }
    let(:game) { create(:game, challenger: challenger, challenged: challenged, status: :pending) }

    let(:challenger_characters) { create_list(:player_character, 2, user: challenger) }
    let(:challenged_characters) { create_list(:player_character, 2, user: challenged) }

    before do
      challenger_characters
      challenged_characters
    end

    it "stores the first player's picks and keeps game pending" do
      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenger_characters.map(&:id) },
        headers: auth_headers(challenger)

      expect(response).to have_http_status(:ok)

      game.reload
      expect(game.status).to eq("pending")
      expect(game.challenger_picks).to eq(challenger_characters.map(&:id))
      expect(game.challenged_picks).to eq([])
      expect(game.characters.count).to eq(0)
      expect(game.turn_order).to eq([])
    end

    it "activates game and rolls initiative after both players confirm" do
      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenger_characters.map(&:id) },
        headers: auth_headers(challenger)

      initiative_capture = nil
      allow(InitiativeService).to receive(:roll) do |characters|
        initiative_capture = characters.to_a
        characters.map(&:id).reverse
      end

      travel_to Time.zone.parse("2026-03-17 13:00:00") do
        post "/games/#{game.id}/select_characters",
          params: { player_character_ids: challenged_characters.map(&:id) },
          headers: auth_headers(challenged)
      end

      expect(response).to have_http_status(:ok)

      game.reload
      expect(game.status).to eq("active")
      expect(game.turn_order).to eq(game.characters.order(id: :desc).pluck(:id))
      expect(game.current_turn_index).to eq(0)
      expect(game.characters.count).to eq(4)
      expect(game.characters.where(user_id: challenger.id).count).to eq(2)
      expect(game.characters.where(user_id: challenged.id).count).to eq(2)

      challenger_chars = game.characters.where(user_id: challenger.id).order(:id)
      challenged_chars = game.characters.where(user_id: challenged.id).order(:id)

      challenger_positions = challenger_chars.map { |c| [ c.position["x"], c.position["y"] ] }
      challenged_positions = challenged_chars.map { |c| [ c.position["x"], c.position["y"] ] }

      expect(challenger_positions.uniq.size).to eq(2)
      expect(challenged_positions.uniq.size).to eq(2)

      expect(challenger_positions.all? { |p| [ [ 1, 1 ], [ 2, 1 ], [ 1, 2 ], [ 2, 2 ] ].include?(p) }).to be_truthy
      expect(challenged_positions.all? { |p| [ [ 11, 11 ], [ 12, 11 ], [ 11, 12 ], [ 12, 12 ] ].include?(p) }).to be_truthy
      expect(initiative_capture.size).to eq(4)

      expect(challenger_chars.map(&:icon)).to eq(challenger_characters.map(&:icon))
      expect(challenged_chars.map(&:icon)).to eq(challenged_characters.map(&:icon))
    end

    it "assigns distinct spawn positions to each character per team" do
      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenger_characters.map(&:id) },
        headers: auth_headers(challenger)

      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenged_characters.map(&:id) },
        headers: auth_headers(challenged)

      chars = game.reload.characters
      challenger_chars = chars.select { |c| c.user_id == challenger.id }
      challenged_chars = chars.select { |c| c.user_id == challenged.id }

      challenger_positions = challenger_chars.map { |c| [ c.position["x"], c.position["y"] ] }
      challenged_positions = challenged_chars.map { |c| [ c.position["x"], c.position["y"] ] }

      expect(challenger_positions.uniq.size).to eq(2)
      expect(challenged_positions.uniq.size).to eq(2)
    end

    it "returns validation errors for wrong count, duplicates, and foreign ids" do
      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: [ challenger_characters.first.id ] },
        headers: auth_headers(challenger)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("player_character_ids must contain exactly 2 ids")

      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: [ challenger_characters.first.id, challenger_characters.first.id ] },
        headers: auth_headers(challenger)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("player_character_ids cannot contain duplicates")

      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: [ challenger_characters.first.id, challenged_characters.first.id ] },
        headers: auth_headers(challenger)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("player_character_ids must belong to current user")
    end

    it "rejects re-submission after a player has already confirmed" do
      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenger_characters.map(&:id) },
        headers: auth_headers(challenger)

      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenger_characters.reverse.map(&:id) },
        headers: auth_headers(challenger)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("Already confirmed")
    end

    it "copies icons from PlayerCharacters to Characters in picks order" do
      challenger_characters[0].update!(icon: "warrior")
      challenger_characters[1].update!(icon: "mage")
      challenged_characters[0].update!(icon: "rogue")
      challenged_characters[1].update!(icon: "archer")

      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenger_characters.map(&:id) },
        headers: auth_headers(challenger)

      post "/games/#{game.id}/select_characters",
        params: { player_character_ids: challenged_characters.map(&:id) },
        headers: auth_headers(challenged)

      game.reload
      challenger_chars = game.characters.where(user_id: challenger.id).order(:id)
      challenged_chars = game.characters.where(user_id: challenged.id).order(:id)

      expect(challenger_chars.map(&:icon)).to eq([ "warrior", "mage" ])
      expect(challenged_chars.map(&:icon)).to eq([ "rogue", "archer" ])
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
