require 'rails_helper'

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  describe 'associations' do
    it { is_expected.to have_many(:refresh_tokens).dependent(:destroy) }
    it { is_expected.to have_many(:sent_friend_requests).class_name('Friendship').with_foreign_key(:requester_id).dependent(:destroy) }
    it { is_expected.to have_many(:received_friend_requests).class_name('Friendship').with_foreign_key(:recipient_id).dependent(:destroy) }
    it { is_expected.to have_many(:game_characters).dependent(:destroy) }
    it { is_expected.to have_many(:games_as_challenger).class_name('Game').with_foreign_key(:challenger_id).dependent(:nullify) }
    it { is_expected.to have_many(:games_as_challenged).class_name('Game').with_foreign_key(:challenged_id).dependent(:nullify) }
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

  describe '#games_as_challenger' do
    it 'returns games where the user is the challenger' do
      user = create(:user)
      game1 = create(:game, challenger: user)
      game2 = create(:game, challenger: user)
      other_game = create(:game)

      expect(user.games_as_challenger).to contain_exactly(game1, game2)
      expect(user.games_as_challenger).not_to include(other_game)
    end
  end

  describe '#games_as_challenged' do
    it 'returns games where the user is the challenged' do
      user = create(:user)
      game1 = create(:game, challenged: user)
      game2 = create(:game, challenged: user)
      other_game = create(:game)

      expect(user.games_as_challenged).to contain_exactly(game1, game2)
      expect(user.games_as_challenged).not_to include(other_game)
    end
  end

  describe 'dependent: :nullify for game associations' do
    it 'nullifies challenger_id when user is deleted' do
      user = create(:user)
      game = create(:game, challenger: user)

      expect(game.challenger_id).to eq(user.id)

      user.destroy

      game.reload
      expect(game.challenger_id).to be_nil
      expect(Game.exists?(game.id)).to be true
    end

    it 'nullifies challenged_id when user is deleted' do
      user = create(:user)
      game = create(:game, challenged: user)

      expect(game.challenged_id).to eq(user.id)

      user.destroy

      game.reload
      expect(game.challenged_id).to be_nil
      expect(Game.exists?(game.id)).to be true
    end

    it 'does not delete games when user is deleted' do
      user = create(:user)
      challenger_game = create(:game, challenger: user)
      challenged_game = create(:game, challenged: user)

      expect { user.destroy }.not_to change(Game, :count)
      expect(Game.exists?(challenger_game.id)).to be true
      expect(Game.exists?(challenged_game.id)).to be true
    end
  end
end
