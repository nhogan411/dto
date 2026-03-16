require "rails_helper"

RSpec.describe CombatCalculator do
  describe ".success_rate" do
    let(:attacker_facing) { { x: 4, y: 4 } }
    let(:defender_pos) { { x: 4, y: 4 } }
    let(:defender_facing) { { x: 4, y: 3 } }

    it "returns 11 for front attack without defense" do
      attacker_pos = { x: 4, y: 3 }

      rate = described_class.success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, false)

      expect(rate).to eq(11)
    end

    it "returns 7 for side attack without defense" do
      attacker_pos = { x: 5, y: 4 }

      rate = described_class.success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, false)

      expect(rate).to eq(7)
    end

    it "returns 3 for back attack without defense" do
      attacker_pos = { x: 4, y: 5 }

      rate = described_class.success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, false)

      expect(rate).to eq(3)
    end

    it "returns 17 for front attack against defending target" do
      attacker_pos = { x: 4, y: 3 }

      rate = described_class.success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, true)

      expect(rate).to eq(17)
    end

    it "returns 13 for side attack against defending target" do
      attacker_pos = { x: 5, y: 4 }

      rate = described_class.success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, true)

      expect(rate).to eq(13)
    end

    it "returns 9 for back attack against defending target" do
      attacker_pos = { x: 4, y: 5 }

      rate = described_class.success_rate(attacker_pos, attacker_facing, defender_pos, defender_facing, true)

      expect(rate).to eq(9)
    end
  end

  describe ".roll_attack" do
    it "returns a miss below threshold" do
      result = described_class.roll_attack(11, rand_val: 5)

      expect(result).to eq(hit: false, critical: false, damage: 0, roll: 5)
    end

    it "returns a hit at threshold" do
      result = described_class.roll_attack(11, rand_val: 11)

      expect(result).to eq(hit: true, critical: false, damage: 1, roll: 11)
    end

    it "returns a hit above threshold" do
      result = described_class.roll_attack(11, rand_val: 15)

      expect(result).to eq(hit: true, critical: false, damage: 1, roll: 15)
    end

    it "returns a critical hit on natural 20" do
      result = described_class.roll_attack(11, rand_val: 20)

      expect(result).to eq(hit: true, critical: true, damage: 2, roll: 20)
    end

    it "lets natural 20 hit even against threshold 21" do
      result = described_class.roll_attack(21, rand_val: 20)

      expect(result).to eq(hit: true, critical: true, damage: 2, roll: 20)
    end

    it "returns a miss on roll 1 below threshold" do
      result = described_class.roll_attack(11, rand_val: 1)

      expect(result).to eq(hit: false, critical: false, damage: 0, roll: 1)
    end

    it "includes the roll in the result hash" do
      result = described_class.roll_attack(11, rand_val: 15)

      expect(result[:roll]).to eq(15)
    end
  end

  describe ".attack_direction" do
    it "returns front when attacker is on the defender front tile" do
      direction = described_class.attack_direction({ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 3 })

      expect(direction).to eq(:front)
    end

    it "returns side when attacker is on a defender side tile" do
      direction = described_class.attack_direction({ x: 5, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 })

      expect(direction).to eq(:side)
    end

    it "returns back when attacker is on the defender back tile" do
      direction = described_class.attack_direction({ x: 4, y: 5 }, { x: 4, y: 4 }, { x: 4, y: 3 })

      expect(direction).to eq(:back)
    end
  end
end
