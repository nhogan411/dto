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

  describe '#stat_modifier' do
    context 'when stat exists' do
      it 'returns 2 for str: 14 (D&D formula: (14 - 10) / 2)' do
        character.stats = { "str" => 14 }
        expect(character.stat_modifier("str")).to eq(2)
      end

      it 'returns -1 for dex: 8 (D&D formula: (8 - 10) / 2)' do
        character.stats = { "dex" => 8 }
        expect(character.stat_modifier("dex")).to eq(-1)
      end

      it 'returns 0 for con: 10' do
        character.stats = { "con" => 10 }
        expect(character.stat_modifier("con")).to eq(0)
      end

      it 'handles symbol stat names' do
        character.stats = { "str" => 16 }
        expect(character.stat_modifier(:str)).to eq(3)
      end
    end

    context 'when stat is missing' do
      it 'raises ArgumentError with descriptive message' do
        character.stats = {}
        expect { character.stat_modifier("str") }.to raise_error(ArgumentError, /str.*missing/)
      end
    end
  end

  describe '#attack_bonus' do
    context 'for warrior (attack_stat: str)' do
      it 'returns attack_bonus = stat_modifier("str") + proficiency_bonus' do
        character.stats = {
          "str" => 14,
          "dex" => 8,
          "attack_stat" => "str",
          "proficiency_bonus" => 2
        }
        # (14 - 10) / 2 + 2 = 2 + 2 = 4
        expect(character.attack_bonus).to eq(4)
      end
    end

    context 'for scout (attack_stat: dex)' do
      it 'returns attack_bonus = stat_modifier("dex") + proficiency_bonus' do
        character.stats = {
          "str" => 8,
          "dex" => 14,
          "attack_stat" => "dex",
          "proficiency_bonus" => 2
        }
        # (14 - 10) / 2 + 2 = 2 + 2 = 4
        expect(character.attack_bonus).to eq(4)
      end
    end

    context 'when attack_stat is missing' do
      it 'raises ArgumentError' do
        character.stats = { "str" => 14, "proficiency_bonus" => 2 }
        expect { character.attack_bonus }.to raise_error(ArgumentError, /attack_stat.*missing/)
      end
    end

    context 'when proficiency_bonus is missing' do
      it 'raises ArgumentError' do
        character.stats = { "str" => 14, "attack_stat" => "str" }
        expect { character.attack_bonus }.to raise_error(ArgumentError, /proficiency_bonus.*missing/)
      end
    end
  end

  describe '#effective_ac' do
    context 'when not defending' do
      it 'returns base ac' do
        character.is_defending = false
        character.stats = { "ac" => 15 }
        expect(character.effective_ac).to eq(15)
      end
    end

    context 'when defending' do
      it 'returns ac + 2' do
        character.is_defending = true
        character.stats = { "ac" => 15 }
        # 15 + 2 = 17
        expect(character.effective_ac).to eq(17)
      end
    end

    context 'when ac is missing' do
      it 'raises ArgumentError' do
        character.is_defending = false
        character.stats = {}
        expect { character.effective_ac }.to raise_error(ArgumentError, /ac.*missing/)
      end
    end
  end

  describe '#damage_die' do
    it 'returns damage_die as integer' do
      character.stats = { "damage_die" => 8 }
      expect(character.damage_die).to eq(8)
    end

    context 'when damage_die is missing' do
      it 'raises ArgumentError' do
        character.stats = {}
        expect { character.damage_die }.to raise_error(ArgumentError, /damage_die.*missing/)
      end
    end
  end
end
