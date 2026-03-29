module ActionValidators
  class AttackValidator < BaseValidator
    def validate!
      super
      validate_not_already_attacked!
      validate_not_already_defended!
      validate_target_exists!
      validate_target_belongs_to_opponent!
      validate_target_alive!
      validate_range!
    end

    private

    def validate_not_already_attacked!
      raise ValidationError, "Character has already attacked this turn" if turn_context[:has_attacked]
    end

    def validate_not_already_defended!
      raise ValidationError, "Character has already defended this turn" if turn_context[:has_defended]
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

    def validate_range!
      attacker_pos = normalize_position(character.position)
      target_pos = normalize_position(target_character.position)
      
      range = (character.stats["range"] || 1).to_i
      dx = (attacker_pos[:x] - target_pos[:x]).abs
      dy = (attacker_pos[:y] - target_pos[:y]).abs
      manhattan_distance = dx + dy
      
      raise ValidationError, "Target is out of range" if manhattan_distance > range
    end

    def target_character
      return @target_character if defined?(@target_character)

       target_id = action_data[:target_character_id]
       @target_character = target_id.present? ? game.game_characters.find_by(id: target_id) : nil
    end
  end
end
