require "rails_helper"

RSpec.describe GameStateService do
  describe "#snapshot" do
    it "returns canonical snapshot including ordered last_action" do
      game = create(:game, status: :active, current_turn_user: nil)
      game.update!(current_turn_user: game.challenger)
      attacker = create(:game_character, game:, user: game.challenger, position: { x: 1, y: 1 })
      _defender = create(:game_character, game:, user: game.challenged, position: { x: 1, y: 2 })

      old_action = create(:game_action, game:, game_character: attacker, turn_number: 1, sequence_number: 0, action_type: :move)
      new_action = create(:game_action, game:, game_character: attacker, turn_number: 1, sequence_number: 1, action_type: :attack)

      snapshot = described_class.new(game).snapshot

      expect(snapshot).to include(
        game_id: game.id,
        status: "active",
        current_turn_user_id: game.current_turn_user_id,
        winner_id: game.winner_id,
        board_config: game.board_config
      )
      expect(snapshot[:turn_number]).to eq(1)
      expect(snapshot[:characters].size).to eq(2)
      expect(snapshot[:characters].first).to include(:id, :user_id, :position, :facing_tile, :current_hp, :max_hp, :is_defending, :stats, :alive, :icon)
      expect(snapshot[:last_action]["id"]).to eq(new_action.id)
      expect(snapshot[:last_action]["id"]).not_to eq(old_action.id)
    end

    it "returns nil last_action when no actions exist" do
      game = create(:game, status: :active, current_turn_user: nil)
      game.update!(current_turn_user: game.challenger)
      create(:game_character, game:, user: game.challenger)
      create(:game_character, game:, user: game.challenged)

      snapshot = described_class.new(game).snapshot
      expect(snapshot[:last_action]).to be_nil
    end

    it "includes icon in character snapshots" do
      game = create(:game, status: :active, current_turn_user: nil)
      game.update!(current_turn_user: game.challenger)
      char = create(:game_character, game:, user: game.challenger, icon: "mage")

      snapshot = described_class.new(game).snapshot
      character_snapshot = snapshot[:characters].find { |c| c[:id] == char.id }

      expect(character_snapshot[:icon]).to eq("mage")
    end
  end
end
