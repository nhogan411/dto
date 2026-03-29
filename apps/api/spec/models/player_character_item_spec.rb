require 'rails_helper'

RSpec.describe PlayerCharacterItem, type: :model do
  subject(:item) { build(:player_character_item) }

  describe 'associations' do
    it { is_expected.to belong_to(:player_character) }
  end

  describe 'validations' do
    it 'is valid with a known item_slug' do
      item.item_slug = 'shortsword'
      expect(item).to be_valid
    end

    it 'is invalid with an unknown item_slug' do
      item.item_slug = 'flamingsword'
      expect(item).not_to be_valid
      expect(item.errors[:item_slug]).to include('is not included in the list')
    end
  end

  describe 'one equipped weapon constraint' do
    it 'allows one equipped item' do
      pc = create(:player_character)
      create(:player_character_item, player_character: pc, item_slug: 'shortsword', equipped: true)
      second = build(:player_character_item, player_character: pc, item_slug: 'shortsword', equipped: true)
      second.item_slug = 'shortsword'
      expect(second).not_to be_valid
    end

    it 'allows an unequipped item alongside an equipped one' do
      pc = create(:player_character)
      create(:player_character_item, player_character: pc, item_slug: 'shortsword', equipped: true)
      equipped = pc.player_character_items.find_by(equipped: true)
      expect(equipped).to be_valid
    end
  end
end
