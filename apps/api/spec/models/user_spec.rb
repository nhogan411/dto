require 'rails_helper'

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  describe 'associations' do
    it { is_expected.to have_many(:refresh_tokens).dependent(:destroy) }
    it { is_expected.to have_many(:sent_friend_requests).class_name('Friendship').with_foreign_key(:requester_id).dependent(:destroy) }
    it { is_expected.to have_many(:received_friend_requests).class_name('Friendship').with_foreign_key(:recipient_id).dependent(:destroy) }
    it { is_expected.to have_many(:characters).dependent(:destroy) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_presence_of(:username) }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }
    it { is_expected.to validate_uniqueness_of(:username).case_insensitive }

    it 'requires a valid email format' do
      user.email = 'invalid-email'

      expect(user).not_to be_valid
      expect(user.errors[:email]).to be_present
    end
  end
end
