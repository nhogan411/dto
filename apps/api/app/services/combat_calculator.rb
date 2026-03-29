class CombatCalculator
  POSITIONAL_BONUS = {
    front: 0,
    side: 1,
    back: 2
  }.freeze

  class << self
    def roll_attack(attacker, target, position:, rand_val: nil)
      if rand_val.is_a?(Hash) || rand_val.is_a?(ActiveSupport::HashWithIndifferentAccess)
        d20_roll = rand_val[:d20] || rand_val["d20"]
        damage_roll_val = rand_val[:damage] || rand_val["damage"]
        old_format = false
      elsif rand_val.is_a?(Numeric) || (rand_val.is_a?(String) && rand_val.match?(/^\d+$/))
        d20_roll = rand_val.to_i
        damage_roll_val = nil
        old_format = true
      else
        d20_roll = nil
        damage_roll_val = nil
        old_format = false
      end

      natural_roll = d20_roll || rand(1..20)

      attack_bonus = attacker.attack_bonus
      positional_bonus = POSITIONAL_BONUS[position]
      target_ac = target.effective_ac
      damage_bonus = old_format ? 0 : attacker.stat_modifier(attacker.stats["attack_stat"])

      # Resolve damage die: prefer equipped weapon over archetype default
      weapon_slug = attacker.stats["weapon_slug"] || attacker.stats[:weapon_slug]
      weapon_item = weapon_slug ? EquipmentDefinitions::ITEMS[weapon_slug.to_s] : nil
      effective_damage_die = weapon_item ? weapon_item[:damage_die] : attacker.damage_die

      if natural_roll == 1
        return {
          natural_roll: 1,
          total: 1,
          attack_bonus: attack_bonus,
          positional_bonus: positional_bonus,
          target_ac: target_ac,
          hit: false,
          critical: false,
          damage: 0,
          damage_roll: 0,
          damage_bonus: 0
        }
      end

      if natural_roll == 20
        if old_format
          damage = 2
          damage_roll = 2
        else
          damage_val = damage_roll_val || rand(1..effective_damage_die)
          damage_roll = damage_val * 2
          damage = damage_roll + damage_bonus
        end

        return {
          natural_roll: 20,
          total: 20 + attack_bonus + positional_bonus,
          attack_bonus: attack_bonus,
          positional_bonus: positional_bonus,
          target_ac: target_ac,
          hit: true,
          critical: true,
          damage: damage,
          damage_roll: damage_roll,
          damage_bonus: damage_bonus
        }
      end

      total = natural_roll + attack_bonus + positional_bonus
      hit = total >= target_ac

      if hit
        if old_format
          damage = 1
          damage_roll = 1
        else
          damage_roll = damage_roll_val || rand(1..effective_damage_die)
          damage = damage_roll + damage_bonus
        end
      else
        damage_roll = 0
        damage = 0
      end

      {
        natural_roll: natural_roll,
        total: total,
        attack_bonus: attack_bonus,
        positional_bonus: positional_bonus,
        target_ac: target_ac,
        hit: hit,
        critical: false,
        damage: damage,
        damage_roll: damage_roll,
        damage_bonus: damage_bonus
      }
    end

    def success_rate(attacker, target, position:)
      positional_bonus = POSITIONAL_BONUS[position]
      needed = target.effective_ac - attacker.attack_bonus - positional_bonus

      favorable = [ 0, [ 20 - needed + 1, 19 ].min ].max + 1

      favorable / 20.0
    end

    def attack_direction(attacker_pos, attacker_facing, target_pos, target_facing)
      _attacker_facing = attacker_facing
      relative_attack_direction(attacker_pos, target_pos, target_facing)
    end

    private

    def relative_attack_direction(attacker_pos, defender_pos, defender_facing)
      attacker = normalize(attacker_pos)
      defender = normalize(defender_pos)

      vector = facing_vector(defender, normalize(defender_facing))

      front_tile = { x: defender[:x] + vector[:x], y: defender[:y] + vector[:y] }
      back_tile = { x: defender[:x] - vector[:x], y: defender[:y] - vector[:y] }
      side_a_tile = { x: defender[:x] - vector[:y], y: defender[:y] + vector[:x] }
      side_b_tile = { x: defender[:x] + vector[:y], y: defender[:y] - vector[:x] }

      return :front if same_pos?(attacker, front_tile)
      return :side if same_pos?(attacker, side_a_tile) || same_pos?(attacker, side_b_tile)
      return :back if same_pos?(attacker, back_tile)

      :back
    end

    def facing_vector(position, facing_tile)
      dx = facing_tile[:x] - position[:x]
      dy = facing_tile[:y] - position[:y]

      return { x: 1, y: 0 } if dx.positive?
      return { x: -1, y: 0 } if dx.negative?
      return { x: 0, y: 1 } if dy.positive?

      { x: 0, y: -1 }
    end

    def normalize(position)
      {
        x: position[:x].to_i,
        y: position[:y].to_i
      }
    end

    def same_pos?(a, b)
      a[:x] == b[:x] && a[:y] == b[:y]
    end
  end
end
