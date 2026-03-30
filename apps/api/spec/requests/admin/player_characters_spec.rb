require "rails_helper"

RSpec.describe "Admin::PlayerCharacters", type: :request do
  let!(:regular_user) { create(:user) }
  let!(:admin_user) { create(:user, :admin) }
  let!(:player_character) { create(:player_character, user: regular_user, name: "Test Character", icon: "warrior", locked: false) }

  describe "GET /admin/player_characters" do
    context "without token" do
      it "returns 401 unauthorized" do
        get "/admin/player_characters"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        access_token = JsonWebToken.encode(user_id: regular_user.id)

        get "/admin/player_characters", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      it "returns all player characters ordered by user_id, id" do
        other_user = create(:user)
        char1 = create(:player_character, user: regular_user, name: "Char 1")
        char2 = create(:player_character, user: other_user, name: "Char 2")
        char3 = create(:player_character, user: regular_user, name: "Char 3")

        access_token = JsonWebToken.encode(user_id: admin_user.id)

        get "/admin/player_characters", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        # Verify ordering: user_id ascending, then id ascending
        user_ids = data.map { |c| c["user_id"] }
        expect(user_ids).to eq(user_ids.sort)

        # Verify all characters returned
        expect(data.size).to be >= 4
        expect(data.map { |c| c["name"] }).to include("Test Character", "Char 1", "Char 2", "Char 3")
      end

      it "filters by user_id when provided" do
        other_user = create(:user)
        create(:player_character, user: other_user, name: "Other User Char")

        access_token = JsonWebToken.encode(user_id: admin_user.id)

        get "/admin/player_characters?user_id=#{regular_user.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data.all? { |c| c["user_id"] == regular_user.id }).to be true
        expect(data.map { |c| c["name"] }).to include("Test Character")
        expect(data.map { |c| c["name"] }).not_to include("Other User Char")
      end

      it "returns expected serialization fields" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        get "/admin/player_characters", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        character = body["data"].first

        expect(character.keys).to match_array(%w[id user_id name icon locked archetype race])
        expect(character["id"]).to be_a(Integer)
        expect(character["user_id"]).to be_a(Integer)
        expect(character["name"]).to be_a(String)
        expect(character["icon"]).to be_a(String)
        expect([ true, false ]).to include(character["locked"])
      end
    end
  end

  describe "GET /admin/player_characters/:id" do
    context "without token" do
      it "returns 401 unauthorized" do
        get "/admin/player_characters/#{player_character.id}"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        access_token = JsonWebToken.encode(user_id: regular_user.id)

        get "/admin/player_characters/#{player_character.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      it "returns the player character" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        get "/admin/player_characters/#{player_character.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data["id"]).to eq(player_character.id)
        expect(data["user_id"]).to eq(regular_user.id)
        expect(data["name"]).to eq("Test Character")
        expect(data["icon"]).to eq("warrior")
        expect(data["locked"]).to eq(false)
      end

      it "returns 404 for non-existent id" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        get "/admin/player_characters/99999", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end

  describe "POST /admin/player_characters" do
    context "without token" do
      it "returns 401 unauthorized" do
        post "/admin/player_characters", params: { user_id: regular_user.id, name: "New Char", icon: "mage", locked: false }

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        access_token = JsonWebToken.encode(user_id: regular_user.id)

        post "/admin/player_characters", params: { user_id: regular_user.id, name: "New Char", icon: "mage", locked: false }, headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      it "creates a player character and returns 201" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        expect {
          post "/admin/player_characters", params: { user_id: regular_user.id, name: "New Char", archetype: "scout", locked: true }, headers: { "Authorization" => "Bearer #{access_token}" }
        }.to change(PlayerCharacter, :count).by(1)

        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data["user_id"]).to eq(regular_user.id)
        expect(data["name"]).to eq("New Char")
        expect(data["archetype"]).to eq("scout")
        expect(data["icon"]).to eq("scout")
        expect(data["locked"]).to eq(true)
      end

      it "returns 422 with validation errors for invalid data" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        post "/admin/player_characters", params: { user_id: regular_user.id, name: "", archetype: "warrior" }, headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["errors"]).to be_an(Array)
        expect(body["errors"]).not_to be_empty
      end
    end
  end

  describe "PATCH /admin/player_characters/:id" do
    context "without token" do
      it "returns 401 unauthorized" do
        patch "/admin/player_characters/#{player_character.id}", params: { name: "Updated Name" }

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        access_token = JsonWebToken.encode(user_id: regular_user.id)

        patch "/admin/player_characters/#{player_character.id}", params: { name: "Updated Name" }, headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      it "updates the player character and returns 200" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        patch "/admin/player_characters/#{player_character.id}", params: { name: "Updated Name", archetype: "scout", locked: true }, headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data["name"]).to eq("Updated Name")
        expect(data["archetype"]).to eq("scout")
        expect(data["icon"]).to eq("scout")
        expect(data["locked"]).to eq(true)

        player_character.reload
        expect(player_character.name).to eq("Updated Name")
        expect(player_character.archetype).to eq("scout")
        expect(player_character.icon).to eq("scout")
        expect(player_character.locked).to eq(true)
      end

      it "returns 422 with validation errors for invalid data" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        patch "/admin/player_characters/#{player_character.id}", params: { name: "" }, headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["errors"]).to be_an(Array)
        expect(body["errors"]).not_to be_empty
      end

      it "returns 404 for non-existent id" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        patch "/admin/player_characters/99999", params: { name: "Updated Name" }, headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end

  describe "DELETE /admin/player_characters/:id" do
    context "without token" do
      it "returns 401 unauthorized" do
        delete "/admin/player_characters/#{player_character.id}"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        access_token = JsonWebToken.encode(user_id: regular_user.id)

        delete "/admin/player_characters/#{player_character.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      it "destroys the player character and returns 204" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        expect {
          delete "/admin/player_characters/#{player_character.id}", headers: { "Authorization" => "Bearer #{access_token}" }
        }.to change(PlayerCharacter, :count).by(-1)

        expect(response).to have_http_status(:no_content)
        expect(response.body).to be_empty
      end

      it "returns 404 for non-existent id" do
        access_token = JsonWebToken.encode(user_id: admin_user.id)

        delete "/admin/player_characters/99999", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end
end
