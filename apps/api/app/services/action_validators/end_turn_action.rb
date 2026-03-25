module ActionValidators
  class EndTurnAction < BaseAction
    def validate!
      EndTurnValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      next_index = compute_next_turn_index
      next_character = next_index ? game.game_characters.find_by(id: game.turn_order[next_index]) : nil
      {
        next_character_id: next_character&.id,
        turn_number: game.game_actions.where(action_type: :end_turn).count + 2
      }
    end

    def apply!(result:)
      facing = action_data.with_indifferent_access[:facing_tile].to_h.with_indifferent_access
      next_index = compute_next_turn_index
      next_character = next_index ? game.game_characters.find_by(id: game.turn_order[next_index]) : nil

      character.update!(is_defending: false, facing_tile: { x: facing[:x], y: facing[:y] })
      next_character&.update!(is_defending: false)
      game.update!(
        current_turn_index: next_index || game.current_turn_index,
        current_turn_user_id: next_character ? next_character.user_id : game.current_turn_user_id
      )
    end

    private

    def compute_next_turn_index
      ComputeNextTurnIndex.call(game)
    end
  end
end
