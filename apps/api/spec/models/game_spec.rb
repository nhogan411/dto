require 'rails_helper'

RSpec.describe Game, type: :model do
  subject(:game) { build(:game) }

  describe 'associations' do
    it { is_expected.to belong_to(:challenger).class_name('User') }
    it { is_expected.to belong_to(:challenged).class_name('User') }
    it { is_expected.to belong_to(:current_turn_user).class_name('User').optional }
    it { is_expected.to belong_to(:winner).class_name('User').optional }
     it { is_expected.to have_many(:game_characters).dependent(:destroy) }
    it { is_expected.to have_many(:game_actions).dependent(:destroy) }
  end

  describe 'enums' do
     it { is_expected.to define_enum_for(:status).with_values(pending: 0, active: 1, completed: 2, forfeited: 3, accepted: 4, declined: 5) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:board_config) }

    it 'requires challenger and challenged' do
      game.challenger = nil
      game.challenged = nil

      expect(game).not_to be_valid
      expect(game.errors[:challenger]).to be_present
      expect(game.errors[:challenged]).to be_present
    end

    it 'rejects the same user for both players' do
      game.challenged = game.challenger

      expect(game).not_to be_valid
      expect(game.errors[:base]).to include('challenger and challenged must be different users')
    end
  end
end
