require 'rails_helper'

RSpec.describe PlayerCharacter, type: :model do
  subject(:player_character) { build(:player_character) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_presence_of(:icon) }
  end

  describe '.for_owner' do
    it 'returns only characters for the provided user' do
      owner = create(:user)
      other_user = create(:user)
      owned_character = create(:player_character, user: owner)
      create(:player_character, user: other_user)

      expect(described_class.for_owner(owner)).to contain_exactly(owned_character)
    end
  end

  describe '.provision_for' do
    it 'creates six unlocked player characters using seeded names and icons' do
      user = create(:user)

      provisioned = described_class.provision_for(user)

      expect(provisioned.size).to eq(6)
      expect(user.reload.id).to be_present
      expect(user.id).to eq(provisioned.first.user_id)
      expect(provisioned.map(&:user_id).uniq).to eq([ user.id ])
      expect(provisioned.map(&:name).uniq.size).to eq(6)
      expect(provisioned.map(&:name)).to all(be_in(described_class::AVAILABLE_NAMES))
      expect(provisioned.map(&:icon)).to all(be_in(described_class::AVAILABLE_ICONS))
      expect(provisioned).to all(have_attributes(locked: false))
    end
  end
end
