require "rails_helper"

RSpec.describe ActionValidators::EndTurnValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil) }
  let(:challenger) { game.challenger }
  let(:character) { create(:character, game:, user: challenger, position: { x: 4, y: 4 }) }
  let(:opponent) { create(:character, game:, user: game.challenged, position: { x: 7, y: 7 }) }
  let(:action_data) { { facing_tile: { x: 4, y: 3 } } }
  let(:turn_context) { { current_user_id: challenger.id, moves_taken: 1, has_ended_turn: false } }

  subject(:validator) { described_class.new(game:, character:, action_data:, turn_context:) }

  before do
    game.update!(current_turn_user: challenger)
    opponent
  end

  it "accepts valid facing tile with movement done" do
    expect { validator.validate! }.not_to raise_error
  end

  it "rejects if already ended turn" do
    validator = described_class.new(game:, character:, action_data:, turn_context: turn_context.merge(has_ended_turn: true))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Turn has already ended")
  end

  it "rejects non-cardinal facing tile" do
    validator = described_class.new(game:, character:, action_data: { facing_tile: { x: 5, y: 5 } }, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "facing_tile must be adjacent cardinal tile")
  end

  it "rejects no movement when not adjacent to opponent" do
    validator = described_class.new(game:, character:, action_data:, turn_context: turn_context.merge(moves_taken: 0))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Must move at least 1 square unless adjacent to opponent")
  end

  it "allows no movement when already adjacent to opponent" do
    opponent.update!(position: { x: 4, y: 5 })
    validator = described_class.new(game:, character:, action_data:, turn_context: turn_context.merge(moves_taken: 0))

    expect { validator.validate! }.not_to raise_error
  end
end
