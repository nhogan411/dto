require "rails_helper"

RSpec.describe AuthService do
  describe ".register" do
    it "creates a user and returns auth payload" do
      payload = described_class.register(email: "new@example.com", username: "newuser", password: "password123")

      expect(payload[:access_token]).to be_present
      expect(payload[:refresh_token]).to be_present
      expect(payload[:user]).to be_persisted
      expect(payload[:user].email).to eq("new@example.com")
    end

    it "stores hashed refresh token only" do
      payload = described_class.register(email: "hash@example.com", username: "hashuser", password: "password123")

      stored = payload[:user].refresh_tokens.last
      expect(stored.token).not_to eq(payload[:refresh_token])
      expect(stored.matches_token?(payload[:refresh_token])).to be(true)
    end
  end

  describe ".login" do
    let!(:user) { create(:user, email: "login@example.com", password: "password123") }

    it "returns tokens for valid credentials" do
      payload = described_class.login("login@example.com", "password123")

      expect(payload[:access_token]).to be_present
      expect(payload[:refresh_token]).to be_present
      expect(payload[:user]).to eq(user)
    end

    it "raises for invalid credentials" do
      expect do
        described_class.login("login@example.com", "wrong")
      end.to raise_error(AuthService::AuthError, "Invalid email or password")
    end
  end

  describe ".refresh" do
    let!(:user) { create(:user) }
    let!(:_record) { nil }
    let!(:raw_token) { nil }

    before do
      _record, token = RefreshToken.issue_for(user)
      @raw_token = token
    end

    it "returns new access token for active refresh token" do
      payload = described_class.refresh(@raw_token)

      expect(payload[:access_token]).to be_present
      expect(payload[:user]).to eq(user)
    end

    it "raises for invalid refresh token" do
      expect do
        described_class.refresh("bad-token")
      end.to raise_error(AuthService::AuthError, "Invalid refresh token")
    end
  end

  describe ".logout" do
    let!(:user) { create(:user) }

    it "revokes the active refresh token" do
      refresh_record, raw_token = RefreshToken.issue_for(user)

      expect(described_class.logout(raw_token)).to be(true)
      expect(refresh_record.reload).to be_revoked
    end

    it "returns false for unknown refresh token" do
      expect(described_class.logout("nope")).to be(false)
    end
  end
end
