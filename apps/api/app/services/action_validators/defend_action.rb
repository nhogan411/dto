module ActionValidators
  class DefendAction < BaseAction
    def validate!
      DefendValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      {
        turn_number: game.game_actions.where(action_type: [:end_turn, :defend]).count + 2
      }
    end

    def apply!(result:)
      facing = action_data.with_indifferent_access[:facing_tile].to_h.with_indifferent_access
      character.update!(is_defending: true, facing_tile: { x: facing[:x], y: facing[:y] })
      advance_turn!
    end

    private

    def advance_turn!
      next_index = compute_next_turn_index
      next_character = next_index ? game.game_characters.find_by(id: game.turn_order[next_index]) : nil
      next_character&.update!(is_defending: false)
      game.update!(
        current_turn_index: next_index || game.current_turn_index,
        current_turn_user_id: next_character ? next_character.user_id : game.current_turn_user_id
      )
    end

    def compute_next_turn_index
      ComputeNextTurnIndex.call(game)
    end
  end
end
