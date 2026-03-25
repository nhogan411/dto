module ActionValidators
  class MoveAction < BaseAction
    def validate!
      MoveValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      from_position = character.position.with_indifferent_access.slice(:x, :y)
      path = action_data.with_indifferent_access.fetch(:path, [])
      to_position = path.last.with_indifferent_access.slice(:x, :y)
      { from_position:, to_position: }
    end

    def apply!(result:)
      to = result[:to_position].with_indifferent_access
      character.update!(position: { x: to[:x], y: to[:y] })
    end
  end
end
