require "rails_helper"

RSpec.describe ActionValidators::AttackValidator do
  let(:game) { create(:game, status: :active, current_turn_user: nil) }
  let(:challenger) { game.challenger }
  let(:actor) { create(:game_character, game:, user: challenger, position: { x: 3, y: 3 }) }
  let(:target) { create(:game_character, game:, user: game.challenged, position: { x: 3, y: 4 }, current_hp: 5) }
  let(:turn_context) { { current_user_id: challenger.id, has_attacked: false } }
  let(:action_data) { { target_character_id: target.id } }

  subject(:validator) { described_class.new(game:, character: actor, action_data:, turn_context:) }

  before do
    actor
    game.update!(current_turn_user: challenger, turn_order: [ actor.id ], current_turn_index: 0)
    target
  end

  describe "range validation" do
    it "accepts target within range (adjacent, manhattan distance = 1)" do
      # Actor at (3,3), target at (3,4) -> distance = 1
      # Default range is 1 for melee
      expect { validator.validate! }.not_to raise_error
    end

    it "accepts target at exact range limit" do
      # Actor at (3,3), target at (4,3) -> distance = 1
      target.update!(position: { x: 4, y: 3 })
      expect { validator.validate! }.not_to raise_error
    end

    it "rejects target out of range (manhattan distance = 2)" do
      # Actor at (3,3), target at (5,3) -> distance = 2
      target.update!(position: { x: 5, y: 3 })

      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target is out of range")
    end

    it "rejects target diagonally adjacent (manhattan distance = 2)" do
      # Actor at (3,3), target at (4,4) -> distance = 2 (1+1)
      target.update!(position: { x: 4, y: 4 })

      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target is out of range")
    end

    it "rejects target far away (manhattan distance = 4)" do
      # Actor at (3,3), target at (5,5) -> distance = 4 (2+2)
      target.update!(position: { x: 5, y: 5 })

      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target is out of range")
    end
  end

  it "rejects when already attacked this turn" do
    validator = described_class.new(game:, character: actor, action_data:, turn_context: turn_context.merge(has_attacked: true))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character has already attacked this turn")
  end

  context 'when character has already defended this turn' do
    let(:turn_context) { { current_user_id: challenger.id, has_attacked: false, has_defended: true } }

    it 'raises ValidationError' do
      expect { validator.validate! }
        .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character has already defended this turn")
    end
  end

  it "rejects missing target" do
    validator = described_class.new(game:, character: actor, action_data: { target_character_id: -1 }, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target character not found")
  end

  it "rejects ally target" do
    ally = create(:game_character, game:, user: challenger, position: { x: 3, y: 4 })
    validator = described_class.new(game:, character: actor, action_data: { target_character_id: ally.id }, turn_context:)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target must belong to opponent")
  end

  it "rejects dead target" do
    target.update!(current_hp: 0)

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target is not alive")
  end
end
