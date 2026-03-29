require "rails_helper"

RSpec.describe "PlayerCharacters", type: :request do
  describe "GET /player_characters" do
    it "returns only the current user's player characters" do
      user = create(:user)
      other_user = create(:user)
      PlayerCharacter.provision_for(user)
      PlayerCharacter.provision_for(other_user)

      get "/player_characters", headers: auth_headers(user)

      expect(response).to have_http_status(:ok)

      data = json_response.fetch("data")
      expect(data.size).to eq(6)
      expect(data.pluck("id")).to contain_exactly(*user_id_ordered_character_ids(user))
      expect(data.pluck("name")).to all(be_in(PlayerCharacter::AVAILABLE_NAMES))
    end

    it 'includes archetype in the response' do
      user = create(:user)
      create(:player_character, user: user, archetype: 'scout')

      get '/player_characters', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      character = response.parsed_body.dig('data', 0)
      expect(character['archetype']).to eq('scout')
    end
  end

  describe "PATCH /player_characters/:id" do
    it "updates the current user's name and icon" do
      user = create(:user)
      player_character = create(:player_character, user: user, name: "Aldric", icon: "warrior", locked: false)

      patch "/player_characters/#{player_character.id}",
        params: { name: "Brenna", archetype: "scout" },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(player_character.reload.name).to eq("Brenna")
      expect(player_character.icon).to eq("scout")
      expect(player_character.locked).to be(false)
      expect(json_response.dig("data", "name")).to eq("Brenna")
      expect(json_response.dig("data", "icon")).to eq("scout")
    end

    it "does not allow users to update locked" do
      user = create(:user)
      player_character = create(:player_character, user: user, locked: false)

      patch "/player_characters/#{player_character.id}",
        params: { name: "Caelum", archetype: "warrior", locked: true },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(player_character.reload.locked).to be(false)
      expect(json_response.dig("data", "locked")).to be(false)
    end

    it "returns 404 when the player character belongs to another user" do
      user = create(:user)
      other_user = create(:user)
      player_character = create(:player_character, user: other_user)

      patch "/player_characters/#{player_character.id}",
        params: { name: "Dara", archetype: "scout" },
        headers: auth_headers(user)

      expect(response).to have_http_status(:not_found)
      expect(json_response.fetch("errors")).to include("Player character not found")
      expect(player_character.reload.name).not_to eq("Dara")
    end

    context 'when updating archetype to scout' do
      it 'updates archetype and derives icon' do
        user = create(:user)
        character = create(:player_character, user: user, archetype: 'warrior')

        patch "/player_characters/#{character.id}",
          params: { archetype: 'scout' },
          headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        expect(json.dig('data', 'archetype')).to eq('scout')
        expect(json.dig('data', 'icon')).to eq('scout')
      end
    end

    context 'when sending an invalid archetype' do
      it 'returns 422' do
        user = create(:user)
        character = create(:player_character, user: user)

        patch "/player_characters/#{character.id}",
          params: { archetype: 'mage' },
          headers: auth_headers(user)

        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "POST /signup" do
    let(:params) do
      {
        user: {
          email: "stable@example.com",
          username: "stableuser",
          password: "password123"
        }
      }
    end

    it "provisions six player characters for the new user" do
      post "/signup", params: params

      expect(response).to have_http_status(:created)

      user = User.find_by!(email: "stable@example.com")
      characters = PlayerCharacter.for_owner(user).order(:id)

      expect(characters.size).to eq(6)
      expect(characters.map(&:name).uniq.size).to eq(6)
      expect(characters.map(&:name)).to all(be_in(PlayerCharacter::AVAILABLE_NAMES))
      valid_icons = ArchetypeDefinitions::VALID_ARCHETYPES.map { |a| ArchetypeDefinitions.icon_for(a) }
      expect(characters.map(&:icon)).to all(be_in(valid_icons))
      expect(characters).to all(have_attributes(locked: false))
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

  def user_id_ordered_character_ids(user)
    PlayerCharacter.for_owner(user).order(:id).pluck(:id)
  end
end
