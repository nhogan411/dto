require "rails_helper"

RSpec.describe ActionValidators::BaseValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil) }
  let(:attacker_user) { game.challenger }
  let(:character) { create(:game_character, game:, user: attacker_user) }
  let(:turn_context) { { current_user_id: attacker_user.id } }

  before do
    character
    game.update!(current_turn_user: attacker_user, turn_order: [ character.id ], current_turn_index: 0)
  end

  subject(:validator) { described_class.new(game:, character:, action_data: {}, turn_context:) }

  describe "#validate!" do
    it "passes when game is active, ownership and turn match" do
      expect { validator.validate! }.not_to raise_error
    end

    it "raises when game is not active" do
      game.update!(status: :pending)

      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "Game is not active")
    end

    it "raises when character does not belong to current_user_id" do
      validator = described_class.new(game:, character:, action_data: {}, turn_context: { current_user_id: game.challenged_id })

      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character does not belong to current user")
    end

    it "raises when it is not the character turn" do
      outsider = create(:game_character, game:, user: game.challenged)
      game.update!(current_turn_user: game.challenged, turn_order: [ outsider.id ], current_turn_index: 0)

      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "It is not this character's turn")
    end
  end

  describe "#valid?" do
    it "returns true for valid context" do
      expect(validator.valid?).to be(true)
    end

    it "returns false for invalid context" do
      game.update!(status: :pending)
      expect(validator.valid?).to be(false)
    end
  end
end
