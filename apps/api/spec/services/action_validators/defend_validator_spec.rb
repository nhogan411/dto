require "rails_helper"

RSpec.describe ActionValidators::DefendValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil) }
  let(:challenger) { game.challenger }
  let(:character) { create(:character, game:, user: challenger, position: { x: 4, y: 4 }) }
  let(:action_data) { { facing_tile: { x: 4, y: 3 } } }
  let(:turn_context) { { current_user_id: challenger.id, has_defended: false, has_attacked: false, has_ended_turn: false } }

  before do
    character
    game.update!(current_turn_user: challenger, turn_order: [ character.id ], current_turn_index: 0)
  end

  subject(:validator) { described_class.new(game:, character:, action_data:, turn_context:) }

  it "accepts defend when no conflicting actions happened" do
    expect { validator.validate! }.not_to raise_error
  end

  it "rejects second defend" do
    validator = described_class.new(game:, character:, action_data:, turn_context: turn_context.merge(has_defended: true))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character has already defended this turn")
  end

  it "rejects defend after attack" do
    validator = described_class.new(game:, character:, action_data:, turn_context: turn_context.merge(has_attacked: true))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character has already attacked this turn")
  end

  it "rejects defend after turn ended" do
    validator = described_class.new(game:, character:, action_data:, turn_context: turn_context.merge(has_ended_turn: true))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Turn has already ended")
  end

  context "facing tile validation" do
    let(:character) { create(:character, game:, user: challenger, position: { x: 4, y: 4 }) }

    it "accepts valid facing tile pointing north" do
      validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 4, y: 3 } }, turn_context:)
      expect { validator.validate! }.not_to raise_error
    end

    it "accepts valid facing tile pointing south" do
      validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 4, y: 5 } }, turn_context:)
      expect { validator.validate! }.not_to raise_error
    end

    it "accepts valid facing tile pointing east" do
      validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 5, y: 4 } }, turn_context:)
      expect { validator.validate! }.not_to raise_error
    end

    it "accepts valid facing tile pointing west" do
      validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 3, y: 4 } }, turn_context:)
      expect { validator.validate! }.not_to raise_error
    end

    it "rejects missing facing_tile" do
      validator = described_class.new(game:, character:, action_data: {}, turn_context:)
      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "facing_tile must be adjacent cardinal tile")
    end

    it "rejects non-adjacent facing tile" do
      validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 99, y: 99 } }, turn_context:)
      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "facing_tile must be adjacent cardinal tile")
    end

    it "rejects diagonal facing tile" do
      validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 5, y: 5 } }, turn_context:)
      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "facing_tile must be adjacent cardinal tile")
    end
  end
end
