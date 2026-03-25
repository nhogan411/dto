require 'rails_helper'

RSpec.describe GameAction, type: :model do
  subject(:game_action) { build(:game_action) }

   describe 'associations' do
     it { is_expected.to belong_to(:game) }
     it { is_expected.to belong_to(:game_character) }
   end

  describe 'enums' do
    it { is_expected.to define_enum_for(:action_type).with_values(move: 0, attack: 1, defend: 2, end_turn: 3) }
  end

  describe 'validations' do
    it 'requires action_data to not be nil' do
      game_action.action_data = nil
      expect(game_action).not_to be_valid
      expect(game_action.errors[:action_data]).to be_present
    end

    it 'allows action_data to be an empty hash' do
      game_action.action_data = {}
      expect(game_action).to be_valid
    end

    it { is_expected.to validate_presence_of(:turn_number) }
    it { is_expected.to validate_presence_of(:sequence_number) }
    it { is_expected.to validate_numericality_of(:turn_number).is_greater_than(0) }
    it { is_expected.to validate_numericality_of(:sequence_number).is_greater_than_or_equal_to(0) }

     it 'requires game and game_character' do
       game_action.game = nil
       game_action.game_character = nil

       expect(game_action).not_to be_valid
       expect(game_action.errors[:game]).to be_present
       expect(game_action.errors[:game_character]).to be_present
     end
  end

  describe 'immutability' do
    it 'disallows updates and deletes once persisted' do
      record = create(:game_action)

      expect { record.update!(sequence_number: 1) }.to raise_error(ActiveRecord::ReadOnlyRecord)
      expect { record.destroy! }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end
  end
end
