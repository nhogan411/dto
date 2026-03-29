module RaceDefinitions
  RACES = {
    "human" => {
      stat_bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
      traits: [],
      movement_bonus: 0,
      size: "medium",
      subraces: {}
    },
    "elf" => {
      stat_bonuses: { dex: 2 },
      traits: [],
      movement_bonus: 0,
      size: "medium",
      subraces: {
        "high_elf" => { stat_bonuses: { int: 1 }, traits: [] },
        "wood_elf" => { stat_bonuses: { wis: 1 }, traits: [], movement_bonus: 5 },
        "drow"     => { stat_bonuses: { cha: 1 }, traits: [] }
      }
    },
    "dwarf" => {
      stat_bonuses: { con: 2 },
      traits: [],
      movement_bonus: -5,
      size: "medium",
      subraces: {
        "hill_dwarf"     => { stat_bonuses: { wis: 1 }, traits: [] },
        "mountain_dwarf" => { stat_bonuses: { str: 2 }, traits: [] }
      }
    },
    "halfling" => {
      stat_bonuses: { dex: 2 },
      traits: [],
      movement_bonus: -5,
      size: "small",
      subraces: {
        "lightfoot" => { stat_bonuses: { cha: 1 }, traits: [] },
        "stout"     => { stat_bonuses: { con: 1 }, traits: [] }
      }
    },
    "gnome" => {
      stat_bonuses: { int: 2 },
      traits: [],
      movement_bonus: -5,
      size: "small",
      subraces: {
        "forest_gnome" => { stat_bonuses: { dex: 1 }, traits: [] },
        "rock_gnome"   => { stat_bonuses: { con: 1 }, traits: [] }
      }
    },
    "half_elf" => {
      stat_bonuses: { cha: 2 },
      traits: [],
      movement_bonus: 0,
      size: "medium",
      subraces: {}
    },
    "half_orc" => {
      stat_bonuses: { str: 2, con: 1 },
      traits: [],
      movement_bonus: 0,
      size: "medium",
      subraces: {}
    },
    "tiefling" => {
      stat_bonuses: { int: 1, cha: 2 },
      traits: [],
      movement_bonus: 0,
      size: "medium",
      subraces: {}
    }
  }.freeze

  VALID_RACES = RACES.keys.freeze

  def self.stats_for(race)
    RACES.fetch(race)
  end

  def self.stat_bonuses_for(race)
    RACES.dig(race, :stat_bonuses) || {}
  end
end
