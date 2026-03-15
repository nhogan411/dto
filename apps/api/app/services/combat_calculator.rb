class CombatCalculator
  class << self
    def success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, defender_is_defending)
      _attacker_facing = attacker_facing
      direction = relative_attack_direction(attacker_pos, defender_pos, defender_facing)

      base_rate = case direction
      when :front then 0.50
      when :side then 0.70
      else 0.90
      end

      return base_rate unless defender_is_defending

      [ (base_rate * 100 - 30).round / 100.0, 0.0 ].max
    end

    def roll_attack(success_rate, rand_val: nil)
      roll = rand_val.nil? ? rand : rand_val.to_f

      return { hit: false, critical: false, damage: 0 } if roll > success_rate.to_f
      return { hit: true, critical: true, damage: 2 } if roll <= 0.05

      { hit: true, critical: false, damage: 1 }
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
