require 'rails_helper'

RSpec.describe PlayerCharacter, type: :model do
  subject(:player_character) { build(:player_character) }

  describe 'associations' do
    it { is_expected.to belong_to(:user) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
  end

  describe 'archetype validations' do
    it { is_expected.to validate_presence_of(:archetype) }

    it 'is valid with warrior archetype' do
      player_character.archetype = 'warrior'
      expect(player_character).to be_valid
    end

    it 'is valid with scout archetype' do
      player_character.archetype = 'scout'
      expect(player_character).to be_valid
    end

    it 'is invalid with an unknown archetype' do
      player_character.archetype = 'mage'
      expect(player_character).not_to be_valid
      expect(player_character.errors[:archetype]).to include("is not included in the list")
    end
  end

  describe 'icon derivation' do
    it 'sets icon to warrior when archetype is warrior' do
      player_character.archetype = 'warrior'
      player_character.valid?
      expect(player_character.icon).to eq('warrior')
    end

    it 'sets icon to scout when archetype is scout' do
      player_character.archetype = 'scout'
      player_character.valid?
      expect(player_character.icon).to eq('scout')
    end
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
    it 'creates six characters all with valid archetypes' do
      user = create(:user)
      provisioned = described_class.provision_for(user)
      expect(provisioned.map(&:archetype)).to all(be_in(ArchetypeDefinitions::VALID_ARCHETYPES))
    end

    it 'creates six unlocked player characters using seeded names and derived icons' do
      user = create(:user)

      provisioned = described_class.provision_for(user)

      expect(provisioned.size).to eq(6)
      expect(user.reload.id).to be_present
      expect(user.id).to eq(provisioned.first.user_id)
      expect(provisioned.map(&:user_id).uniq).to eq([ user.id ])
      expect(provisioned.map(&:name).uniq.size).to eq(6)
      expect(provisioned.map(&:name)).to all(be_in(described_class::AVAILABLE_NAMES))
      valid_icons = ArchetypeDefinitions::VALID_ARCHETYPES.map { |a| ArchetypeDefinitions.icon_for(a) }
      expect(provisioned.map(&:icon)).to all(be_in(valid_icons))
      expect(provisioned).to all(have_attributes(locked: false))
    end

    it 'gives each provisioned character an equipped shortsword' do
      user = create(:user)
      provisioned = described_class.provision_for(user)
      provisioned.each do |pc|
        item = pc.player_character_items.find_by(equipped: true)
        expect(item).to be_present
        expect(item.item_slug).to eq('shortsword')
      end
    end
  end

  describe '#calculate_level' do
    it 'is 1 at 0 XP' do
      pc = build(:player_character, xp: 0)
      expect(pc.calculate_level).to eq(1)
    end

    it 'is 2 at 300 XP' do
      pc = build(:player_character, xp: 300)
      expect(pc.calculate_level).to eq(2)
    end

    it 'is 3 at 900 XP' do
      pc = build(:player_character, xp: 900)
      expect(pc.calculate_level).to eq(3)
    end

    it 'is 5 at 6500 XP' do
      pc = build(:player_character, xp: 6500)
      expect(pc.calculate_level).to eq(5)
    end

    it 'is capped at 20 even at 999_999 XP' do
      pc = build(:player_character, xp: 999_999)
      expect(pc.calculate_level).to eq(20)
    end
  end

  describe '#award_xp!' do
    it 'adds XP and recalculates level' do
      pc = create(:player_character, xp: 0, level: 1, archetype: 'warrior')
      pc.award_xp!(300)
      expect(pc.reload.xp).to eq(300)
      expect(pc.reload.level).to eq(2)
    end

    it 'recalculates max_hp on level up for warrior (hit_die 10)' do
      pc = create(:player_character, xp: 0, level: 1, archetype: 'warrior')
      pc.award_xp!(300)
      # warrior hit_die=10 → hp_per_level = 10/2+1 = 6. level 2 → 16 + (2-1)*6 = 22
      expect(pc.reload.max_hp).to eq(22)
    end

    it 'recalculates max_hp on level up for scout (hit_die 8)' do
      pc = create(:player_character, xp: 0, level: 1, archetype: 'scout', max_hp: 10)
      pc.award_xp!(300)
      # scout hit_die=8 → hp_per_level = 8/2+1 = 5. level 2 → 10 + (2-1)*5 = 15
      expect(pc.reload.max_hp).to eq(15)
    end

    it 'does not change level when XP stays below next threshold' do
      pc = create(:player_character, xp: 0, level: 1, archetype: 'scout', max_hp: 10)
      pc.award_xp!(100)
      expect(pc.reload.level).to eq(1)
      expect(pc.reload.max_hp).to eq(10)
    end

    it 'does not exceed level 20' do
      pc = create(:player_character, xp: 354_999, level: 19, archetype: 'warrior', max_hp: 106)
      pc.award_xp!(50_000)
      expect(pc.reload.level).to eq(20)
    end
  end
end
