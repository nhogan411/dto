module ActionValidators
  class DefendValidator < BaseValidator
    def validate!
      super
      validate_no_conflicting_actions!
      validate_facing_tile!
    end

    private

    def validate_no_conflicting_actions!
      raise ValidationError, "Character has already defended this turn" if turn_context[:has_defended]
      raise ValidationError, "Character has already attacked this turn" if turn_context[:has_attacked]
      raise ValidationError, "Turn has already ended" if turn_context[:has_ended_turn]
    end

    def validate_facing_tile!
      tile = facing_tile
      position = normalize_position(character.position)
      raise ValidationError, "facing_tile must be adjacent cardinal tile" unless adjacent_cardinal?(position, tile)
    end

    def facing_tile
      @facing_tile ||= normalize_position(action_data[:facing_tile] || {})
    end
  end
end
