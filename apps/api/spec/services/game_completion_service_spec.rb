require "rails_helper"

RSpec.describe GameCompletionService do
  let(:user_a) { create(:user) }
  let(:user_b) { create(:user) }
  let(:pc_a1)  { create(:player_character, user: user_a, archetype: "warrior", xp: 0, level: 1, max_hp: 16) }
  let(:pc_a2)  { create(:player_character, user: user_a, archetype: "scout",   xp: 0, level: 1, max_hp: 10) }
  let(:pc_b1)  { create(:player_character, user: user_b, archetype: "warrior", xp: 0, level: 1, max_hp: 16) }
  let(:pc_b2)  { create(:player_character, user: user_b, archetype: "scout",   xp: 0, level: 1, max_hp: 10) }

  let(:game) do
    create(:game, challenger: user_a, challenged: user_b, status: :completed, winner_id: user_a.id, xp_awarded: false)
  end

  let!(:gc_a1) { create(:game_character, game: game, user: user_a, player_character: pc_a1, current_hp: 10, stats: stats_with_level(1)) }
  let!(:gc_a2) { create(:game_character, game: game, user: user_a, player_character: pc_a2, current_hp: 10, stats: stats_with_level(1)) }
  let!(:gc_b1) { create(:game_character, game: game, user: user_b, player_character: pc_b1, current_hp: 0,  stats: stats_with_level(1)) }
  let!(:gc_b2) { create(:game_character, game: game, user: user_b, player_character: pc_b2, current_hp: 0,  stats: stats_with_level(1)) }

  def stats_with_level(level)
    { "movement" => 3, "str" => 14, "dex" => 8, "attack_stat" => "str", "ac" => 16,
      "damage_die" => 6, "proficiency_bonus" => 2, "level" => level }
  end

  def build_kill_action(killer:, victim:, turn:, seq:)
    create(:game_action,
      game: game,
      game_character: killer,
      action_type: :attack,
      turn_number: turn,
      sequence_number: seq,
      action_data: { target_character_id: victim.id },
      result_data: {
        "hit" => true,
        "target_hp_remaining" => 0,
        "target_id" => victim.id,
        "damage" => 10,
        "critical" => false,
        "roll" => 15,
        "natural_roll" => 15,
        "attack_bonus" => 4,
        "target_ac" => 12,
        "damage_roll" => 8,
        "damage_bonus" => 2,
        "threshold" => 10,
        "direction" => "front",
        "weapon_slug" => "shortsword"
      }
    )
  end

  describe ".call" do
    context "gc_a1 kills gc_b1 then gc_b2 (both gc_a1 and gc_a2 always alive)" do
      before do
        build_kill_action(killer: gc_a1, victim: gc_b1, turn: 1, seq: 1)
        build_kill_action(killer: gc_a1, victim: gc_b2, turn: 1, seq: 2)
      end

      it "awards winners 200 XP each (100 per kill, split 2 ways)" do
        described_class.call(game)
        expect(pc_a1.reload.xp).to eq(200)
        expect(pc_a2.reload.xp).to eq(200)
      end

      it "awards losers 0 XP (no kills made)" do
        described_class.call(game)
        expect(pc_b1.reload.xp).to eq(0)
        expect(pc_b2.reload.xp).to eq(0)
      end

      it "marks the game xp_awarded" do
        described_class.call(game)
        expect(game.reload.xp_awarded).to be true
      end
    end

    context "losers make a kill before losing — XP halved at end" do
      # gc_b1 kills gc_a1 (gc_b1+gc_b2 alive → 100 XP each for losers)
      # gc_a2 kills gc_b1 (only gc_a2 alive on winner side → 200 XP)
      # gc_a2 kills gc_b2 (only gc_a2 alive → 200 XP)
      before do
        build_kill_action(killer: gc_b1, victim: gc_a1, turn: 1, seq: 1)
        build_kill_action(killer: gc_a2, victim: gc_b1, turn: 1, seq: 2)
        build_kill_action(killer: gc_a2, victim: gc_b2, turn: 1, seq: 3)
      end

      it "halves loser XP: gc_b1 and gc_b2 each earned 100, halved to 50" do
        described_class.call(game)
        expect(pc_b1.reload.xp).to eq(50)
        expect(pc_b2.reload.xp).to eq(50)
      end

      it "does not halve winner XP: gc_a2 earned 400" do
        described_class.call(game)
        expect(pc_a2.reload.xp).to eq(400)
      end

      it "gives 0 XP to gc_a1 (dead when gc_a2 made kills)" do
        described_class.call(game)
        expect(pc_a1.reload.xp).to eq(0)
      end
    end

    context "dead characters do not receive XP at kill-time" do
      before do
        # gc_b1 kills gc_a2 first
        build_kill_action(killer: gc_b1, victim: gc_a2, turn: 1, seq: 1)
        # gc_a1 kills gc_b1 (sole survivor on winner side)
        build_kill_action(killer: gc_a1, victim: gc_b1, turn: 1, seq: 2)
        # gc_a1 kills gc_b2
        build_kill_action(killer: gc_a1, victim: gc_b2, turn: 1, seq: 3)
      end

      it "gives 0 XP to gc_a2 (dead when kills occurred)" do
        described_class.call(game)
        expect(pc_a2.reload.xp).to eq(0)
      end

      it "gives gc_a1 full XP as sole survivor (200+200=400)" do
        described_class.call(game)
        expect(pc_a1.reload.xp).to eq(400)
      end
    end

    context "idempotency guard" do
      it "does not award XP twice if xp_awarded is already true" do
        game.update!(xp_awarded: true)
        expect { described_class.call(game) }.not_to change { pc_a1.reload.xp }
      end
    end

    context "winner_id is nil" do
      it "does not raise and does not award XP" do
        game.update!(winner_id: nil)
        expect { described_class.call(game) }.not_to raise_error
        expect(pc_a1.reload.xp).to eq(0)
      end
    end

    it "returns an xp_awards array with an entry for all 4 game characters" do
      build_kill_action(killer: gc_a1, victim: gc_b1, turn: 1, seq: 1)
      build_kill_action(killer: gc_a1, victim: gc_b2, turn: 1, seq: 2)
      awards = described_class.call(game)
      expect(awards.length).to eq(4)
      expect(awards.map { |a| a[:player_character_id] }).to match_array([ pc_a1.id, pc_a2.id, pc_b1.id, pc_b2.id ])
    end

    it "sets leveled_up: false when XP earned is below level-up threshold (200 < 300)" do
      build_kill_action(killer: gc_a1, victim: gc_b1, turn: 1, seq: 1)
      build_kill_action(killer: gc_a1, victim: gc_b2, turn: 1, seq: 2)
      awards = described_class.call(game)
      a1_award = awards.find { |a| a[:player_character_id] == pc_a1.id }
      expect(a1_award[:leveled_up]).to be false
      expect(a1_award[:xp_earned]).to eq(200)
    end
  end
end
