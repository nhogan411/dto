module ActionValidators
  class DefendValidator < BaseValidator
    def validate!
      super
      validate_no_conflicting_actions!
    end

    private

    def validate_no_conflicting_actions!
      raise ValidationError, "Character has already defended this turn" if turn_context[:has_defended]
      raise ValidationError, "Character has already attacked this turn" if turn_context[:has_attacked]
      raise ValidationError, "Turn has already ended" if turn_context[:has_ended_turn]
    end
  end
end
