require "rails_helper"

RSpec.describe JsonWebToken do
  describe ".encode" do
    it "encodes payload with expiration" do
      token = described_class.encode(user_id: 123)

      payload = described_class.decode(token)
      expect(payload[:user_id]).to eq(123)
      expect(payload[:exp]).to be_present
    end
  end

  describe ".decode" do
    it "returns nil for invalid token" do
      expect(described_class.decode("invalid-token")).to be_nil
    end

    it "returns nil for expired token" do
      token = described_class.encode({ user_id: 1 }, exp: 1.minute.ago)

      expect(described_class.decode(token)).to be_nil
    end
  end
end
