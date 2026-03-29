module ActionValidators
  class AttackAction < BaseAction
    def validate!
      AttackValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      target = game.game_characters.find(target_id)

      direction = CombatCalculator.attack_direction(
        character.position.with_indifferent_access,
        character.facing_tile.with_indifferent_access,
        target.position.with_indifferent_access,
        target.facing_tile.with_indifferent_access
      )

      success_rate = CombatCalculator.success_rate(character, target, position: direction)
      roll = CombatCalculator.roll_attack(
        character,
        target,
        position: direction,
        rand_val: action_data.with_indifferent_access[:rand_val]
      )

      target_hp_remaining = [ target.current_hp - roll[:damage].to_i, 0 ].max

      threshold_roll = target.effective_ac - character.attack_bonus - CombatCalculator::POSITIONAL_BONUS[direction]

      {
        hit: roll[:hit],
        critical: roll[:critical],
        damage: roll[:damage],
        roll: roll[:natural_roll],
        threshold: threshold_roll,
        direction: direction.to_s,
        target_hp_remaining:,
        natural_roll: roll[:natural_roll],
        attack_bonus: roll[:attack_bonus],
        target_ac: roll[:target_ac],
        damage_roll: roll[:damage_roll],
        damage_bonus: roll[:damage_bonus],
        target_id: target.id
      }
    end

    def apply!(result:)
      target = game.game_characters.find(result[:target_id])
      target.update!(current_hp: result[:target_hp_remaining])

      return unless target.current_hp <= 0

      opponents_remaining = game.game_characters.where(user_id: target.user_id).where("current_hp > 0").exists?
      game.update!(status: :completed, winner_id: current_user.id) unless opponents_remaining
    end

    private

    def target_id
      action_data.with_indifferent_access[:target_character_id]
    end
  end
end
