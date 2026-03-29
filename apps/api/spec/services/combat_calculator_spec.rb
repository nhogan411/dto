require "rails_helper"

RSpec.describe CombatCalculator do
  # Test fixtures: warrior and scout archetypes with D&D 5e stats
  let(:warrior_stats) do
    {
      "str" => 14,
      "dex" => 8,
      "attack_stat" => "str",
      "ac" => 15,
      "damage_die" => 6,
      "proficiency_bonus" => 2
    }
  end

  let(:scout_stats) do
    {
      "str" => 8,
      "dex" => 14,
      "attack_stat" => "dex",
      "ac" => 12,
      "damage_die" => 6,
      "proficiency_bonus" => 2
    }
  end

  let(:warrior) do
    build(:game_character, stats: warrior_stats, is_defending: false)
  end

  let(:scout) do
    build(:game_character, stats: scout_stats, is_defending: false)
  end

  describe ".roll_attack" do
    context "natural 1 (auto-miss)" do
      it "always misses regardless of bonuses or target AC" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :front,
          rand_val: { d20: 1, damage: 6 }
        )

        expect(result[:hit]).to eq(false)
        expect(result[:critical]).to eq(false)
        expect(result[:damage]).to eq(0)
        expect(result[:natural_roll]).to eq(1)
      end
    end

    context "natural 20 (auto-hit + critical)" do
      it "always hits and doubles damage dice" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :front,
          rand_val: { d20: 20, damage: 4 }
        )

        # Warrior attack_bonus = (14-10)/2 + 2 = 4
        # Warrior damage_bonus = (14-10)/2 = 2
        # Crit damage = (4 * 2) + 2 = 10
        expect(result[:hit]).to eq(true)
        expect(result[:critical]).to eq(true)
        expect(result[:natural_roll]).to eq(20)
        expect(result[:damage]).to eq(10)
      end
    end

    context "normal hit" do
      it "hits when total attack roll meets or exceeds target AC" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :front,
          rand_val: { d20: 15, damage: 3 }
        )

        # Warrior attack_bonus = 4
        # Scout AC = 12
        # Total = 15 + 4 = 19 >= 12
        # Damage = 3 + 2 = 5
        expect(result[:hit]).to eq(true)
        expect(result[:critical]).to eq(false)
        expect(result[:natural_roll]).to eq(15)
        expect(result[:total]).to eq(19)
        expect(result[:target_ac]).to eq(12)
        expect(result[:damage]).to eq(5)
      end
    end

    context "normal miss" do
      it "misses when total attack roll is below target AC" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :front,
          rand_val: { d20: 5, damage: 3 }
        )

        # Total = 5 + 4 = 9 < 12
        expect(result[:hit]).to eq(false)
        expect(result[:critical]).to eq(false)
        expect(result[:damage]).to eq(0)
      end
    end

    context "positional bonus: side attack" do
      it "applies +1 bonus for side position" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :side,
          rand_val: { d20: 7, damage: 3 }
        )

        # Total = 7 + 4 (attack_bonus) + 1 (side) = 12 >= 12
        expect(result[:hit]).to eq(true)
        expect(result[:total]).to eq(12)
        expect(result[:positional_bonus]).to eq(1)
      end
    end

    context "positional bonus: back attack" do
      it "applies +2 bonus for back position" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :back,
          rand_val: { d20: 6, damage: 3 }
        )

        # Total = 6 + 4 (attack_bonus) + 2 (back) = 12 >= 12
        expect(result[:hit]).to eq(true)
        expect(result[:total]).to eq(12)
        expect(result[:positional_bonus]).to eq(2)
      end
    end

    context "defending target" do
      it "uses effective_ac (base + 2) when target is defending" do
        defending_scout = build(:game_character, stats: scout_stats, is_defending: true)

        # Hit case: roll high enough to beat defended AC
        hit_result = described_class.roll_attack(
          warrior,
          defending_scout,
          position: :front,
          rand_val: { d20: 10, damage: 3 }
        )

        # Defending scout AC = 12 + 2 = 14
        # Total = 10 + 4 = 14 >= 14
        expect(hit_result[:hit]).to eq(true)
        expect(hit_result[:target_ac]).to eq(14)

        # Miss case: same roll vs non-defending scout would hit
        miss_result = described_class.roll_attack(
          warrior,
          defending_scout,
          position: :front,
          rand_val: { d20: 8, damage: 3 }
        )

        # Total = 8 + 4 = 12 < 14
        expect(miss_result[:hit]).to eq(false)
      end
    end

    context "result hash structure" do
      it "includes all required keys in result hash" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :front,
          rand_val: { d20: 15, damage: 3 }
        )

        expect(result).to include(
          :natural_roll,
          :total,
          :attack_bonus,
          :positional_bonus,
          :target_ac,
          :hit,
          :critical,
          :damage,
          :damage_roll,
          :damage_bonus
        )
      end
    end

    context "when attacker has weapon_slug in stats" do
      let(:attacker_with_weapon) do
        build(:game_character, stats: warrior_stats.merge("weapon_slug" => "shortsword"), is_defending: false)
      end

      it "uses the weapon damage_die from EquipmentDefinitions instead of archetype damage_die" do
        result = described_class.roll_attack(
          attacker_with_weapon,
          scout,
          position: :front,
          rand_val: { d20: 15, damage: 4 }
        )

        expect(result[:hit]).to eq(true)
        expect(result[:damage_roll]).to eq(4)
      end

      it "falls back to archetype damage_die when weapon_slug is absent" do
        result = described_class.roll_attack(
          warrior,
          scout,
          position: :front,
          rand_val: { d20: 15, damage: 3 }
        )

        expect(result[:damage_roll]).to eq(3)
      end
    end
  end

  describe ".success_rate" do
    it "returns a Float between 0.0 and 1.0" do
      rate = described_class.success_rate(warrior, scout, position: :front)

      expect(rate).to be_a(Float)
      expect(rate).to be >= 0.0
      expect(rate).to be <= 1.0
    end

    it "returns lower success rate when target is defending" do
      defending_scout = build(:game_character, stats: scout_stats, is_defending: true)

      normal_rate = described_class.success_rate(warrior, scout, position: :front)
      defended_rate = described_class.success_rate(warrior, defending_scout, position: :front)

      # Defending increases AC by 2, lowering success rate
      expect(defended_rate).to be < normal_rate
    end

    context "positional impact on success rate" do
      it "has different success rates for front, side, back positions" do
        front_rate = described_class.success_rate(warrior, scout, position: :front)
        side_rate = described_class.success_rate(warrior, scout, position: :side)
        back_rate = described_class.success_rate(warrior, scout, position: :back)

        # Back attacks should have highest success rate, front lowest
        # (because positional bonuses make back attacks more likely to hit)
        expect(back_rate).to be > side_rate
        expect(side_rate).to be > front_rate
      end
    end
  end
end
