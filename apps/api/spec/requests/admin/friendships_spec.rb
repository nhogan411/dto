require "rails_helper"

RSpec.describe "Admin::Friendships", type: :request do
  let!(:user_a) { create(:user, username: "alice") }
  let!(:user_b) { create(:user, username: "bob") }
  let!(:user_c) { create(:user, username: "charlie") }
  let!(:admin) { create(:user, :admin, username: "admin_user") }

  let!(:friendship_1) { Friendship.create!(requester: user_a, recipient: user_b, status: :accepted) }
  let!(:friendship_2) { Friendship.create!(requester: user_b, recipient: user_c, status: :pending) }
  let!(:friendship_3) { Friendship.create!(requester: user_a, recipient: user_c, status: :declined) }

  describe "GET /admin/friendships" do
    context "without token" do
      it "returns 401 unauthorized" do
        get "/admin/friendships"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        token = JsonWebToken.encode(user_id: user_a.id)

        get "/admin/friendships", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      let(:token) { JsonWebToken.encode(user_id: admin.id) }

      it "returns all friendships with nested user objects" do
        get "/admin/friendships", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data.size).to eq(3)

        first = data.first
        expect(first.keys).to match_array(%w[id requester_id recipient_id status created_at requester recipient])
        expect(first["requester"].keys).to match_array(%w[id username])
        expect(first["recipient"].keys).to match_array(%w[id username])
        expect(first["requester"]).not_to have_key("role")
        expect(first["recipient"]).not_to have_key("role")
      end

      it "filters by user_id (requester)" do
        get "/admin/friendships?user_id=#{user_a.id}", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data.size).to eq(2)
        ids = data.map { |f| f["id"] }
        expect(ids).to match_array([ friendship_1.id, friendship_3.id ])
      end

      it "filters by user_id (recipient)" do
        get "/admin/friendships?user_id=#{user_c.id}", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data.size).to eq(2)
        ids = data.map { |f| f["id"] }
        expect(ids).to match_array([ friendship_2.id, friendship_3.id ])
      end

      it "includes nested requester and recipient with id and username only" do
        get "/admin/friendships", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        first = body["data"].first

        expect(first["requester"]["id"]).to eq(user_a.id)
        expect(first["requester"]["username"]).to eq("alice")
        expect(first["recipient"]["id"]).to eq(user_b.id)
        expect(first["recipient"]["username"]).to eq("bob")
      end
    end
  end

  describe "GET /admin/friendships/:id" do
    context "without token" do
      it "returns 401 unauthorized" do
        get "/admin/friendships/#{friendship_1.id}"

        expect(response).to have_http_status(:unauthorized)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Unauthorized")
      end
    end

    context "with player token" do
      it "returns 403 forbidden" do
        token = JsonWebToken.encode(user_id: user_a.id)

        get "/admin/friendships/#{friendship_1.id}", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:forbidden)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Forbidden")
      end
    end

    context "with admin token" do
      let(:token) { JsonWebToken.encode(user_id: admin.id) }

      it "returns the friendship with nested user objects" do
        get "/admin/friendships/#{friendship_1.id}", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        data = body["data"]

        expect(data["id"]).to eq(friendship_1.id)
        expect(data["requester_id"]).to eq(user_a.id)
        expect(data["recipient_id"]).to eq(user_b.id)
        expect(data["status"]).to eq("accepted")
        expect(data["created_at"]).to be_present

        expect(data["requester"]["id"]).to eq(user_a.id)
        expect(data["requester"]["username"]).to eq("alice")
        expect(data["requester"]).not_to have_key("role")

        expect(data["recipient"]["id"]).to eq(user_b.id)
        expect(data["recipient"]["username"]).to eq("bob")
        expect(data["recipient"]).not_to have_key("role")
      end

      it "returns 404 for missing friendship" do
        get "/admin/friendships/99999", headers: { "Authorization" => "Bearer #{token}" }

        expect(response).to have_http_status(:not_found)
        body = JSON.parse(response.body)
        expect(body["errors"]).to include("Not found")
      end
    end
  end
end
