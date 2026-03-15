require "rails_helper"

RSpec.describe CombatCalculator do
  describe ".success_rate" do
    let(:defender_pos) { { x: 4, y: 4 } }
    let(:defender_facing) { { x: 4, y: 3 } }

    it "returns 0.50 for front attack without defense" do
      attacker_pos = { x: 4, y: 3 }

      rate = described_class.success_rate(attacker_pos, { x: 4, y: 4 }, defender_pos, defender_facing, false)
      expect(rate).to eq(0.50)
    end

    it "returns 0.70 for side attack without defense" do
      attacker_pos = { x: 5, y: 4 }

      rate = described_class.success_rate(attacker_pos, { x: 4, y: 4 }, defender_pos, defender_facing, false)
      expect(rate).to eq(0.70)
    end

    it "returns 0.90 for back attack without defense" do
      attacker_pos = { x: 4, y: 5 }

      rate = described_class.success_rate(attacker_pos, { x: 4, y: 4 }, defender_pos, defender_facing, false)
      expect(rate).to eq(0.90)
    end

    it "reduces each base rate by exactly 30pp when defending" do
      front = described_class.success_rate({ x: 4, y: 3 }, { x: 4, y: 4 }, defender_pos, defender_facing, true)
      side = described_class.success_rate({ x: 5, y: 4 }, { x: 4, y: 4 }, defender_pos, defender_facing, true)
      back = described_class.success_rate({ x: 4, y: 5 }, { x: 4, y: 4 }, defender_pos, defender_facing, true)

      expect(front).to eq(0.20)
      expect(side).to eq(0.40)
      expect(back).to eq(0.60)
    end
  end

  describe ".roll_attack" do
    it "returns miss with 0 damage when roll exceeds success_rate" do
      result = described_class.roll_attack(0.50, rand_val: 0.90)

      expect(result).to eq(hit: false, critical: false, damage: 0)
    end

    it "returns critical hit with 2 damage at <= 0.05 roll when hit succeeds" do
      result = described_class.roll_attack(0.90, rand_val: 0.05)

      expect(result).to eq(hit: true, critical: true, damage: 2)
    end

    it "returns normal hit with 1 damage otherwise" do
      result = described_class.roll_attack(0.90, rand_val: 0.20)

      expect(result).to eq(hit: true, critical: false, damage: 1)
    end

    it "uses strict 5% critical threshold" do
      result = described_class.roll_attack(0.90, rand_val: 0.05001)

      expect(result).to eq(hit: true, critical: false, damage: 1)
    end
  end
end
