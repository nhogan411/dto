module EquipmentDefinitions
  # Items keyed by slug. category: "weapon"|"armor"|"consumable"|"tool"|"wondrous"
  # subcategory: "melee"|"ranged", "light"|"medium"|"heavy"|"shield", "potion"|"scroll", etc.
  ITEMS = {
    "shortsword" => {
      name: "Shortsword",
      damage_die: 6,       # 1d6
      damage_bonus: 0,
      range: 1,            # melee only
      stat_used: :dex,     # finesse — uses DEX modifier
      proficiency: true
    }
  }.freeze

  VALID_ITEMS = ITEMS.keys.freeze
end
