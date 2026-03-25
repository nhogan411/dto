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

  it "accepts adjacent opponent target" do
    expect { validator.validate! }.not_to raise_error
  end

  it "rejects non-adjacent targets" do
    target.update!(position: { x: 5, y: 5 })

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Target must be adjacent (cardinal only)")
  end

  it "rejects when already attacked this turn" do
    validator = described_class.new(game:, character: actor, action_data:, turn_context: turn_context.merge(has_attacked: true))

    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character has already attacked this turn")
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
