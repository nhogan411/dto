require "rails_helper"

RSpec.describe ActionValidators::DefendValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil) }
  let(:challenger) { game.challenger }
  let(:character) { create(:character, game:, user: challenger) }
  let(:action_data) { {} }
  let(:turn_context) { { current_user_id: challenger.id, has_defended: false, has_attacked: false, has_ended_turn: false } }

  before { game.update!(current_turn_user: challenger) }

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
end
