require "rails_helper"

RSpec.describe "Profiles", type: :request do
  describe "PATCH /profile" do
    let(:user) { create(:user, email: "profile@example.com", password: "password123") }
    let(:headers) { auth_headers(user) }

    it "updates the current user's email" do
      patch "/profile", params: { profile: { email: "updated@example.com" } }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response).to eq("message" => "Profile updated")
      expect(user.reload.email).to eq("updated@example.com")
    end

    it "rejects duplicate emails" do
      create(:user, email: "taken@example.com")

      patch "/profile", params: { profile: { email: "taken@example.com" } }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("Email has already been taken")
      expect(user.reload.email).to eq("profile@example.com")
    end

    it "changes the password when the current password is correct" do
      patch "/profile",
            params: {
              profile: {
                current_password: "password123",
                new_password: "newpassword123",
                new_password_confirmation: "newpassword123"
              }
            },
            headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response).to eq("message" => "Profile updated")
      expect(user.reload.authenticate("newpassword123")).to eq(user)
    end

    it "rejects a password change with the wrong current password" do
      patch "/profile",
            params: {
              profile: {
                current_password: "wrongpassword",
                new_password: "newpassword123",
                new_password_confirmation: "newpassword123"
              }
            },
            headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("Current password is incorrect")
      expect(user.reload.authenticate("password123")).to eq(user)
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
