module ActionValidators
  class EndTurnValidator < BaseValidator
    def validate!
      super
      validate_not_already_ended!
      validate_facing_tile!
      validate_movement_requirement!
    end

    private

    def validate_not_already_ended!
      raise ValidationError, "Turn has already ended" if turn_context[:has_ended_turn]
    end

    def validate_facing_tile!
      tile = facing_tile
      raise ValidationError, "facing_tile is required" unless tile[:x] && tile[:y]

      position = normalize_position(character.position)
      raise ValidationError, "facing_tile must be adjacent cardinal tile" unless adjacent_cardinal?(position, tile)
    end

    def validate_movement_requirement!
      return if turn_context[:moves_taken].to_i.positive?
      return if adjacent_to_opponent?

      raise ValidationError, "Must move at least 1 square unless adjacent to opponent"
    end

    def adjacent_to_opponent?
      opponent = opponent_character
      return false unless opponent

      adjacent_cardinal?(normalize_position(character.position), normalize_position(opponent.position))
    end

    def facing_tile
      @facing_tile ||= normalize_position(action_data[:facing_tile] || {})
    end
  end
end
