require "rails_helper"

RSpec.describe "Admin::Users", type: :request do
  let!(:player) { create(:user, email: "player@example.com", username: "player") }
  let!(:admin) { create(:user, :admin, email: "admin@example.com", username: "adminuser") }
  let!(:target_user) { create(:user, email: "target@example.com", username: "targetuser") }

  describe "GET /admin/users" do
    context "without authentication token" do
      it "returns 401 Unauthorized" do
        get "/admin/users"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with authenticated non-admin user" do
      it "returns 403 Forbidden" do
        access_token = JsonWebToken.encode(user_id: player.id)

        get "/admin/users", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with authenticated admin user" do
      it "returns all users ordered by created_at" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        get "/admin/users", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        users = body["data"]

        expect(users).to be_an(Array)
        expect(users.size).to eq(3)
        expect(users.first).to include("id", "email", "username", "role", "created_at")
        expect(users.first).not_to have_key("password_digest")
        expect(users.map { |u| u["id"] }).to eq([ player.id, admin.id, target_user.id ])
      end
    end
  end

  describe "GET /admin/users/:id" do
    context "without authentication token" do
      it "returns 401 Unauthorized" do
        get "/admin/users/#{target_user.id}"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with authenticated non-admin user" do
      it "returns 403 Forbidden" do
        access_token = JsonWebToken.encode(user_id: player.id)

        get "/admin/users/#{target_user.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with authenticated admin user" do
      it "returns the user with serialized fields" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        get "/admin/users/#{target_user.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        user_data = body["data"]

        expect(user_data["id"]).to eq(target_user.id)
        expect(user_data["email"]).to eq("target@example.com")
        expect(user_data["username"]).to eq("targetuser")
        expect(user_data["role"]).to eq("player")
        expect(user_data["created_at"]).to be_present
        expect(user_data).not_to have_key("password_digest")
      end

      it "returns 404 for non-existent user" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        get "/admin/users/99999", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end

  describe "PATCH /admin/users/:id" do
    context "without authentication token" do
      it "returns 401 Unauthorized" do
        patch "/admin/users/#{target_user.id}", params: { user: { email: "newemail@example.com" } }

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with authenticated non-admin user" do
      it "returns 403 Forbidden" do
        access_token = JsonWebToken.encode(user_id: player.id)

        patch "/admin/users/#{target_user.id}",
              params: { user: { email: "newemail@example.com" } },
              headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with authenticated admin user" do
      it "updates the user and returns updated data" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        patch "/admin/users/#{target_user.id}",
              params: { user: { email: "updated@example.com", username: "updateduser", role: "admin" } },
              headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        user_data = body["data"]

        expect(user_data["email"]).to eq("updated@example.com")
        expect(user_data["username"]).to eq("updateduser")
        expect(user_data["role"]).to eq("admin")

        target_user.reload
        expect(target_user.email).to eq("updated@example.com")
        expect(target_user.admin?).to be true
      end

      it "returns 422 for invalid data" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        patch "/admin/users/#{target_user.id}",
              params: { user: { email: "invalid-email" } },
              headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["errors"]).to be_an(Array)
        expect(body["errors"].any? { |e| e.include?("Email") }).to be true
      end

      it "returns 404 for non-existent user" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        patch "/admin/users/99999",
              params: { user: { email: "new@example.com" } },
              headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end

  describe "DELETE /admin/users/:id" do
    context "without authentication token" do
      it "returns 401 Unauthorized" do
        delete "/admin/users/#{target_user.id}"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with authenticated non-admin user" do
      it "returns 403 Forbidden" do
        access_token = JsonWebToken.encode(user_id: player.id)

        delete "/admin/users/#{target_user.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with authenticated admin user" do
      it "deletes the user and returns 204" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        expect {
          delete "/admin/users/#{target_user.id}", headers: { "Authorization" => "Bearer #{access_token}" }
        }.to change(User, :count).by(-1)

        expect(response).to have_http_status(:no_content)
        expect(response.body).to be_empty
      end

      it "returns 422 when attempting to delete own account" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        delete "/admin/users/#{admin.id}", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:unprocessable_entity)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Cannot delete your own account")

        expect(User.exists?(admin.id)).to be true
      end

      it "returns 404 for non-existent user" do
        access_token = JsonWebToken.encode(user_id: admin.id)

        delete "/admin/users/99999", headers: { "Authorization" => "Bearer #{access_token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end
end
