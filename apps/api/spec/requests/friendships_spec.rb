require "rails_helper"

RSpec.describe "Friendships", type: :request do
  let(:user) { create(:user, email: "a@b.com", username: "abc", password: "password") }
  let(:headers) { auth_headers(user) }

  describe "GET /friends" do
    it "returns accepted friends for authenticated user" do
      accepted_friend = create(:user, email: "friend@b.com", username: "friend1", password: "password")
      other_user = create(:user, email: "other@b.com", username: "other1", password: "password")

      create(:friendship, requester: user, recipient: accepted_friend, status: :accepted)
      create(:friendship, requester: other_user, recipient: user, status: :pending)

      get "/friends", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response.fetch("data").map { |entry| entry.fetch("id") }).to contain_exactly(accepted_friend.id)
    end
  end

  describe "GET /friends/search" do
    it "returns partial email or username matches excluding self and existing friends" do
      match_by_username = create(:user, email: "rogue@example.com", username: "ShadowRogue", password: "password")
      match_by_email = create(:user, email: "ranger@party.com", username: "scout", password: "password")
      existing_friend = create(:user, email: "pal@party.com", username: "paladin", password: "password")
      pending_user = create(:user, email: "pending@party.com", username: "pendingpal", password: "password")

      create(:friendship, requester: user, recipient: existing_friend, status: :accepted)
      create(:friendship, requester: pending_user, recipient: user, status: :pending)

      get "/friends/search", params: { q: "rogue" }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response.fetch("data").map { |entry| entry.fetch("id") }).to contain_exactly(match_by_username.id)

      get "/friends/search", params: { q: "party" }, headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response.fetch("data").map { |entry| entry.fetch("id") }).to contain_exactly(match_by_email.id)
    end
  end

  describe "GET /friend_requests" do
    it "returns pending sent and received requests" do
      sent_user = create(:user, email: "sent@b.com", username: "sentuser", password: "password")
      received_user = create(:user, email: "received@b.com", username: "receiveduser", password: "password")
      declined_user = create(:user, email: "declined@b.com", username: "declineduser", password: "password")

      sent_request = create(:friendship, requester: user, recipient: sent_user, status: :pending)
      received_request = create(:friendship, requester: received_user, recipient: user, status: :pending)
      create(:friendship, requester: declined_user, recipient: user, status: :declined)

      get "/friend_requests", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response.dig("data", "sent").map { |entry| entry.fetch("id") }).to contain_exactly(sent_request.id)
      expect(json_response.dig("data", "received").map { |entry| entry.fetch("id") }).to contain_exactly(received_request.id)
    end
  end

  describe "POST /friend_requests" do
    let(:recipient) { create(:user, email: "c@d.com", username: "target", password: "password") }

    it "creates pending friendship" do
      post "/friend_requests", params: { recipient_id: recipient.id }, headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response.dig("data", "status")).to eq("pending")

      friendship = Friendship.find_by(requester: user, recipient: recipient)
      expect(friendship).to be_present
      expect(friendship).to be_pending
    end

    it "rejects self-friendship" do
      post "/friend_requests", params: { recipient_id: user.id }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("cannot friend yourself")
    end

    it "rejects duplicate friendship" do
      create(:friendship, requester: user, recipient: recipient, status: :pending)

      post "/friend_requests", params: { recipient_id: recipient.id }, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json_response.fetch("errors")).to include("friendship already exists")
    end

    it "auto-accepts a reverse pending request" do
      reverse_request = create(:friendship, requester: recipient, recipient: user, status: :pending)

      post "/friend_requests", params: { recipient_id: recipient.id }, headers: headers

      expect(response).to have_http_status(:created)
      expect(json_response.dig("data", "id")).to eq(reverse_request.id)
      expect(json_response.dig("data", "status")).to eq("accepted")
      expect(reverse_request.reload).to be_accepted
      expect(Friendship.where(requester: user, recipient: recipient)).to be_empty
    end
  end

  describe "PATCH /friend_requests/:id/accept" do
    it "accepts when current user is recipient" do
      requester = create(:user, email: "requester@b.com", username: "requester1", password: "password")
      friend_request = create(:friendship, requester: requester, recipient: user, status: :pending)

      patch "/friend_requests/#{friend_request.id}/accept", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response.dig("data", "status")).to eq("accepted")
      expect(friend_request.reload).to be_accepted
    end

    it "forbids non-recipient" do
      requester = create(:user, email: "requester2@b.com", username: "requester2", password: "password")
      other_user = create(:user, email: "otheraccept@b.com", username: "otheraccept", password: "password")
      friend_request = create(:friendship, requester: requester, recipient: user, status: :pending)

      patch "/friend_requests/#{friend_request.id}/accept", headers: auth_headers(other_user)

      expect(response).to have_http_status(:forbidden)
      expect(json_response.fetch("errors")).to include("Forbidden")
      expect(friend_request.reload).to be_pending
    end
  end

  describe "PATCH /friend_requests/:id/decline" do
    it "declines when current user is recipient" do
      requester = create(:user, email: "declinereq@b.com", username: "declinereq", password: "password")
      friend_request = create(:friendship, requester: requester, recipient: user, status: :pending)

      patch "/friend_requests/#{friend_request.id}/decline", headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response.dig("data", "status")).to eq("declined")
      expect(friend_request.reload).to be_declined
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
