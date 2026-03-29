module ArchetypeDefinitions
  ARCHETYPES = {
    "warrior" => { icon: "warrior", max_hp: 16, movement: 3, str: 14, dex: 8 },
    "scout" => { icon: "scout", max_hp: 10, movement: 5, str: 8, dex: 14 }
  }.freeze

  VALID_ARCHETYPES = ARCHETYPES.keys.freeze

  def self.stats_for(archetype)
    ARCHETYPES.fetch(archetype)
  end

  def self.icon_for(archetype)
    ARCHETYPES.dig(archetype, :icon)
  end
end
