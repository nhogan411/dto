require 'rails_helper'

RSpec.describe GameCharacter, type: :model do
  subject(:character) { build(:game_character) }

  describe 'associations' do
    it { is_expected.to belong_to(:game) }
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:game_actions).dependent(:destroy) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:position) }
    it { is_expected.to validate_presence_of(:facing_tile) }
    it { is_expected.to validate_numericality_of(:current_hp).is_greater_than_or_equal_to(0) }
    it { is_expected.to validate_numericality_of(:max_hp).is_greater_than(0) }

    it 'requires game and user' do
      character.game = nil
      character.user = nil

      expect(character).not_to be_valid
      expect(character.errors[:game]).to be_present
      expect(character.errors[:user]).to be_present
    end
  end

  describe '#alive?' do
    it 'returns false when current_hp is zero' do
      character.current_hp = 0

      expect(character).not_to be_alive
      expect(character).to be_dead
    end
  end
end
