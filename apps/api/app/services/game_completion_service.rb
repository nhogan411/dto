class GameCompletionService
  XP_BY_LEVEL = {
    1  => 200,   2  => 450,   3  => 700,   4  => 1_100,  5  => 1_800,
    6  => 2_300, 7  => 2_900, 8  => 3_900, 9  => 5_000,  10 => 5_900,
    11 => 7_200, 12 => 8_400, 13 => 10_000, 14 => 11_500, 15 => 13_000,
    16 => 15_000, 17 => 18_000, 18 => 20_000, 19 => 22_000, 20 => 25_000
  }.freeze

  def self.call(game)
    new(game).call
  end

  def initialize(game)
    @game = game
  end

  def call
    return [] if @game.xp_awarded?
    return [] if @game.winner_id.nil?

    xp_map = calculate_xp
    apply_loser_halving!(xp_map)
    awards = write_xp_and_build_awards(xp_map)
    @game.update!(xp_awarded: true)
    awards
  end

  private

  def calculate_xp
    xp_map   = game_characters.each_with_object({}) { |gc, h| h[gc.id] = 0 }
    alive_ids = game_characters.map(&:id).to_set

    kill_actions.each do |action|
      victim_id = action.result_data["target_id"].to_i
      killer_id = action.game_character_id
      victim_gc = gc_by_id[victim_id]
      killer_gc = gc_by_id[killer_id]

      next unless victim_gc && killer_gc

      victim_level = [ victim_gc.stats["level"].to_i, 1 ].max
      xp_pool      = XP_BY_LEVEL.fetch(victim_level, XP_BY_LEVEL[1])

      alive_teammates = game_characters.select { |gc| gc.user_id == killer_gc.user_id && alive_ids.include?(gc.id) }
      share           = alive_teammates.empty? ? 0 : xp_pool / alive_teammates.size # integer division intentional — remainder discarded

      alive_teammates.each { |gc| xp_map[gc.id] += share }
      alive_ids.delete(victim_id)
    end

    xp_map
  end

  def apply_loser_halving!(xp_map)
    loser_ids = game_characters.select { |gc| gc.user_id != @game.winner_id }.map(&:id)
    loser_ids.each { |id| xp_map[id] /= 2 }
  end

  def write_xp_and_build_awards(xp_map)
    game_characters.map do |gc|
      pc         = gc.player_character
      earned_xp  = xp_map[gc.id].to_i
      old_level  = pc&.level || 1
      old_max_hp = pc&.max_hp || gc.max_hp

      pc.award_xp!(earned_xp) if pc && earned_xp > 0
      pc&.reload

      {
        game_character_id:   gc.id,
        player_character_id: pc&.id,
        character_name:      gc.name,
        archetype:           gc.stats["archetype"] || "warrior",
        race:                gc.stats["race"] || "",
        team_user_id:        gc.user_id,
        xp_earned:           earned_xp,
        xp_total:            pc&.xp || 0,
        old_level:           old_level,
        new_level:           pc&.level || old_level,
        leveled_up:          (pc&.level || old_level) > old_level,
        old_max_hp:          old_max_hp,
        new_max_hp:          pc&.max_hp || old_max_hp
      }
    end
  end

  def kill_actions
    @kill_actions ||= @game.game_actions
      .where(action_type: :attack)
      .order(:turn_number, :sequence_number)
      .select { |a| a.result_data["hit"] == true && a.result_data["target_hp_remaining"].to_i == 0 }
  end

  def game_characters
    @game_characters ||= @game.game_characters.includes(:player_character).to_a
  end

  def gc_by_id
    @gc_by_id ||= game_characters.index_by(&:id)
  end
end
