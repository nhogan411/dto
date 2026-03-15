require "rails_helper"

RSpec.describe ActionValidators::MoveValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil, board_config: { "blocked_squares" => blocked, "start_positions" => [ [ 1, 1 ], [ 8, 8 ] ] }) }
  let(:challenger) { game.challenger }
  let(:blocked) { [] }
  let(:actor) { create(:character, game:, user: challenger, position: { x: 1, y: 1 }) }
  let(:opponent) { create(:character, game:, user: game.challenged, position: { x: 3, y: 1 }) }
  let(:turn_context) { { current_user_id: challenger.id, moves_taken: 0 } }
  let(:action_data) { { path: [ { x: 2, y: 1 } ] } }

  before do
    game.update!(current_turn_user: challenger)
    opponent
  end

  subject(:validator) { described_class.new(game:, character: actor, action_data:, turn_context:) }

  it "accepts valid 1-3 cardinal steps" do
    valid_path = { path: [ { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 } ] }
    validator = described_class.new(game:, character: actor, action_data: valid_path, turn_context:)

    expect { validator.validate! }.not_to raise_error
  end

  it "rejects diagonal steps" do
    diagonal = { path: [ { x: 2, y: 2 } ] }
    validator = described_class.new(game:, character: actor, action_data: diagonal, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "First step must be adjacent to current position")
  end

  it "rejects path through blocked squares" do
    game.update!(board_config: { "blocked_squares" => [ [ 2, 1 ] ], "start_positions" => [ [ 1, 1 ], [ 8, 8 ] ] })

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot move through blocked squares")
  end

  it "rejects path longer than 3 squares total" do
    long_path = { path: [ { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 } ] }
    validator = described_class.new(game:, character: actor, action_data: long_path, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path must contain 1 to 3 steps")
  end

  it "rejects landing on opponent position" do
    occupied = { path: [ { x: 2, y: 1 }, { x: 3, y: 1 } ] }
    validator = described_class.new(game:, character: actor, action_data: occupied, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot move onto opponent position")
  end

  it "rejects when move budget would exceed 3" do
    validator = described_class.new(game:, character: actor, action_data:, turn_context: turn_context.merge(moves_taken: 3))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Move budget exceeded for this turn")
  end
end
