export const XP_BY_LEVEL: Record<number, number> = {
  1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
  6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
  11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000,
  16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
};

export const XP_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
  6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
  11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
  16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
};

export interface XpAward {
  game_character_id: number;
  player_character_id: number | null;
  character_name: string;
  archetype: string;
  race: string;
  team_user_id: number;
  xp_earned: number;
  xp_total: number;
  old_level: number;
  new_level: number;
  leveled_up: boolean;
  old_max_hp: number;
  new_max_hp: number;
}