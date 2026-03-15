require 'rails_helper'

RSpec.describe RefreshToken, type: :model do
  subject(:refresh_token) { build(:refresh_token) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:token) }
    it { is_expected.to validate_presence_of(:expires_at) }
    it { is_expected.to validate_uniqueness_of(:token) }

    it 'requires a user' do
      refresh_token.user = nil

      expect(refresh_token).not_to be_valid
      expect(refresh_token.errors[:user]).to be_present
    end
  end

  describe '#active?' do
    it 'returns true when token is not expired or revoked' do
      expect(refresh_token).to be_active
    end
  end
end
