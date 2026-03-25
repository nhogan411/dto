require "rails_helper"

RSpec.describe ActionValidators::MoveValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil) }
  let(:challenger) { game.challenger }
  let(:actor) { create(:game_character, game:, user: challenger, position: { x: 6, y: 6 }) }
  let(:opponent) { create(:game_character, game:, user: game.challenged, position: { x: 8, y: 6 }) }
  let(:turn_context) { { current_user_id: challenger.id, moves_taken: 0 } }
  let(:action_data) { { path: [ { x: 7, y: 6 } ] } }

  before do
    actor
    game.update!(current_turn_user: challenger, turn_order: [ actor.id ], current_turn_index: 0)
    opponent
  end

  subject(:validator) { described_class.new(game:, character: actor, action_data:, turn_context:) }

  it "accepts valid 1-3 cardinal steps" do
    valid_path = { path: [ { x: 6, y: 7 }, { x: 6, y: 8 }, { x: 7, y: 8 } ] }
    validator = described_class.new(game:, character: actor, action_data: valid_path, turn_context:)

    expect { validator.validate! }.not_to raise_error
  end

  it "rejects diagonal steps" do
    diagonal = { path: [ { x: 7, y: 7 } ] }
    validator = described_class.new(game:, character: actor, action_data: diagonal, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "First step must be adjacent to current position")
  end

  it "rejects path through blocked squares" do
    blocked_path = { path: [ { x: 6, y: 5 } ] }
    validator = described_class.new(game:, character: actor, action_data: blocked_path, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot move through blocked squares")
  end

  it "rejects path longer than 3 squares total" do
    long_path = { path: [ { x: 6, y: 7 }, { x: 6, y: 8 }, { x: 7, y: 8 }, { x: 7, y: 7 } ] }
    validator = described_class.new(game:, character: actor, action_data: long_path, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, /Path must contain 1 to 3 steps/)
  end

  context 'when character is a scout with movement 5' do
    before do
      actor.update!(stats: { "movement" => 5 })
    end

    it 'allows a path of up to 5 steps' do
      five_step_path = { path: [
        { x: 6, y: 7 },
        { x: 6, y: 8 },
        { x: 7, y: 8 },
        { x: 8, y: 8 },
        { x: 9, y: 8 }
      ] }
      validator = described_class.new(game:, character: actor, action_data: five_step_path, turn_context:)
      expect { validator.validate! }.not_to raise_error
    end

    it 'rejects a path of 6 steps' do
      six_step_path = { path: [
        { x: 6, y: 7 },
        { x: 6, y: 8 },
        { x: 6, y: 9 },
        { x: 7, y: 9 },
        { x: 7, y: 8 },
        { x: 7, y: 7 }
      ] }
      validator = described_class.new(game:, character: actor, action_data: six_step_path, turn_context:)
      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, /Path must contain 1 to 5 steps/)
    end
  end

  it "rejects landing on opponent position" do
    occupied = { path: [ { x: 7, y: 6 }, { x: 8, y: 6 } ] }
    validator = described_class.new(game:, character: actor, action_data: occupied, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot end on an occupied tile")
  end

  it "rejects when move budget would exceed 3" do
    validator = described_class.new(game:, character: actor, action_data:, turn_context: turn_context.merge(moves_taken: 3))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Move budget exceeded for this turn")
  end

  it "allows path through ally position mid-path" do
    ally = create(:game_character, game:, user: challenger, position: { x: 7, y: 6 })
    game.update!(turn_order: [ actor.id, ally.id ])

    path_through_ally = { path: [ { x: 7, y: 6 }, { x: 7, y: 7 } ] }
    validator = described_class.new(game:, character: actor, action_data: path_through_ally, turn_context:)

    expect { validator.validate! }.not_to raise_error
  end

  it "rejects path ending on ally position" do
    ally = create(:game_character, game:, user: challenger, position: { x: 7, y: 6 })
    game.update!(turn_order: [ actor.id, ally.id ])

    path_to_ally = { path: [ { x: 7, y: 6 } ] }
    validator = described_class.new(game:, character: actor, action_data: path_to_ally, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot end on an occupied tile")
  end

  it "rejects path through opponent position mid-path" do
    path_through_opponent = { path: [ { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 8, y: 5 } ] }
    validator = described_class.new(game:, character: actor, action_data: path_through_opponent, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot move through opponent position")
  end

  it "rejects path ending on opponent position" do
    end_on_opponent = { path: [ { x: 7, y: 6 }, { x: 8, y: 6 } ] }
    validator = described_class.new(game:, character: actor, action_data: end_on_opponent, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Path cannot end on an occupied tile")
  end
end
