require "rails_helper"

RSpec.describe "Auth", type: :request do
  describe "POST /signup" do
    let(:params) do
      {
        user: {
          email: "signup@example.com",
          username: "signupuser",
          password: "password123"
        }
      }
    end

    it "creates account and returns tokens + user" do
      post "/signup", params: params

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body.dig("data", "access_token")).to be_present
      expect(body.dig("data", "refresh_token")).to be_present
      expect(body.dig("data", "user", "email")).to eq("signup@example.com")
    end
  end

  describe "POST /login" do
    let!(:user) { create(:user, email: "login@example.com", password: "password123") }

    it "returns tokens for valid credentials" do
      post "/login", params: { email: user.email, password: "password123" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", "access_token")).to be_present
      expect(body.dig("data", "refresh_token")).to be_present
      expect(body.dig("data", "user", "id")).to eq(user.id)
    end

    it "returns unauthorized for invalid password" do
      post "/login", params: { email: user.email, password: "wrongpassword" }

      expect(response).to have_http_status(:unauthorized)
      body = JSON.parse(response.body)
      expect(body["errors"]).to include("Invalid email or password")
    end
  end

  describe "POST /refresh" do
    let!(:user) { create(:user) }

    it "returns a new access token for valid refresh token" do
      _record, refresh_token = RefreshToken.issue_for(user)

      post "/refresh", params: { refresh_token: refresh_token }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", "access_token")).to be_present
      expect(body.dig("data", "refresh_token")).to be_nil
      expect(body.dig("data", "user", "id")).to eq(user.id)
    end

    it "returns unauthorized for invalid refresh token" do
      post "/refresh", params: { refresh_token: "invalid" }

      expect(response).to have_http_status(:unauthorized)
      body = JSON.parse(response.body)
      expect(body["errors"]).to include("Invalid refresh token")
    end
  end

  describe "DELETE /logout" do
    let!(:user) { create(:user) }

    it "revokes refresh token" do
      refresh_record, refresh_token = RefreshToken.issue_for(user)

      delete "/logout", params: { refresh_token: refresh_token }

      expect(response).to have_http_status(:ok)
      expect(refresh_record.reload).to be_revoked
      body = JSON.parse(response.body)
      expect(body.dig("data", "message")).to eq("Logged out successfully")
    end
  end

  describe "GET /users/me" do
    let!(:user) { create(:user) }

    it "returns current user with valid bearer token" do
      access_token = JsonWebToken.encode(user_id: user.id)

      get "/users/me", headers: { "Authorization" => "Bearer #{access_token}" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.dig("data", "id")).to eq(user.id)
      expect(body.dig("data", "email")).to eq(user.email)
    end

    it "returns unauthorized without token" do
      get "/users/me"

      expect(response).to have_http_status(:unauthorized)
      body = JSON.parse(response.body)
      expect(body["errors"]).to include("Unauthorized")
    end
  end
end
