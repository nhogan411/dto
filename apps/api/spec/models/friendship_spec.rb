require 'rails_helper'

RSpec.describe Friendship, type: :model do
  subject(:friendship) { build(:friendship) }

  describe 'associations' do
    it { is_expected.to belong_to(:requester).class_name('User') }
    it { is_expected.to belong_to(:recipient).class_name('User') }
  end

  describe 'enums' do
    it { is_expected.to define_enum_for(:status).with_values(pending: 0, accepted: 1, declined: 2) }
  end

  describe 'validations' do
    it 'requires requester and recipient' do
      friendship.requester = nil
      friendship.recipient = nil

      expect(friendship).not_to be_valid
      expect(friendship.errors[:requester]).to be_present
      expect(friendship.errors[:recipient]).to be_present
    end

    it 'enforces unique requester/recipient pairs' do
      requester = create(:user)
      recipient = create(:user)

      create(:friendship, requester: requester, recipient: recipient)
      friendship.requester = requester
      friendship.recipient = recipient

      expect(friendship).not_to be_valid
      expect(friendship.errors[:requester_id]).to include('friendship already exists')
    end

    it 'rejects self friendships' do
      requester = create(:user)

      friendship.requester = requester
      friendship.recipient = requester

      expect(friendship).not_to be_valid
      expect(friendship.errors[:base]).to include('cannot friend yourself')
    end

    it 'rejects reverse duplicate friendships' do
      requester = create(:user)
      recipient = create(:user)

      create(:friendship, requester: recipient, recipient: requester)
      friendship.requester = requester
      friendship.recipient = recipient

      expect(friendship).not_to be_valid
      expect(friendship.errors[:base]).to include('friendship already exists')
    end
  end
end
