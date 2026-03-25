module ActionValidators
  class AttackValidator < BaseValidator
    def validate!
      super
      validate_not_already_attacked!
      validate_target_exists!
      validate_target_belongs_to_opponent!
      validate_target_alive!
      validate_target_adjacent!
    end

    private

    def validate_not_already_attacked!
      raise ValidationError, "Character has already attacked this turn" if turn_context[:has_attacked]
    end

    def validate_target_exists!
      raise ValidationError, "Target character not found" unless target_character
    end

    def validate_target_belongs_to_opponent!
      raise ValidationError, "Target must belong to opponent" if target_character.user_id == character.user_id
    end

    def validate_target_alive!
      raise ValidationError, "Target is not alive" unless target_character.alive?
    end

    def validate_target_adjacent!
      attacker_pos = normalize_position(character.position)
      target_pos = normalize_position(target_character.position)
      raise ValidationError, "Target must be adjacent (cardinal only)" unless adjacent_cardinal?(attacker_pos, target_pos)
    end

    def target_character
      return @target_character if defined?(@target_character)

       target_id = action_data[:target_character_id]
       @target_character = target_id.present? ? game.game_characters.find_by(id: target_id) : nil
    end
  end
end
