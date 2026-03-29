module ArchetypeDefinitions
  ARCHETYPES = {
    "warrior" => { icon: "warrior", max_hp: 16, movement: 3, str: 14, dex: 8, attack_stat: "str", ac: 15, damage_die: 6, proficiency_bonus: 2, range: 1 },
    "scout"   => { icon: "scout",   max_hp: 10, movement: 5, str: 8,  dex: 14, attack_stat: "dex", ac: 12, damage_die: 6, proficiency_bonus: 2, range: 1 }
  }.freeze

  VALID_ARCHETYPES = ARCHETYPES.keys.freeze

  def self.stats_for(archetype)
    ARCHETYPES.fetch(archetype)
  end

  def self.icon_for(archetype)
    ARCHETYPES.dig(archetype, :icon)
  end
end
