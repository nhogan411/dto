class PlayerCharacter < ApplicationRecord
  PROVISION_COUNT = 6
  AVAILABLE_NAMES = %w[
    Xavier Summers Drake McCoy Warren Jean Grey Calvin Lorna Dane Alex Wagner
    Kurt Logan Cassidy Sean Scott James Ororo Yoshida Shiro Piotr Pryde Rogue
    Magnus Braddock Blaire Remy Lee Bishop Guthrie Nathan Dayspring Dani Frost
    Xorn Jono Cain Raven Victor Cred Hisako Megan da\ Costa Namor McKenzie
    Neena Illyana Elizabeth Alison Karima Laura Ramsey Haller Nate Clarice
    Monet Gabby Madrox Everett David Kamala Idie Joanna Sooraya Julian Keller
    Santo Nori Victor Hope Arkady Akihiro Lila Duke Trask Bennet Marko Yuriko
    Jason Nathaniel Shaw Harada Emma Wilson Cortez Shinobi Hank Lang Felicia
    Shuri Romanoff Rogers Danvers Carol Steve Ty Layla Bowen Murdock Matt Sam
    Blaze Clint Barton Tandy Tony Stark Bruce Banner Susan Danny Rand Jones
    Rider Rich Richard Castle Walters Jennifer Marc Peter Pete Parker Drew
    Brock Cho Mac Hudson Chris Powell Brooks Brian Douglas Foley Greg Dwayne
    Taylor Alexander Cage Miles Morales Hobie Ross Barnes Monroe Nico
  ].freeze

  XP_THRESHOLDS = {
    1  => 0,       2  => 300,     3  => 900,     4  => 2_700,
    5  => 6_500,   6  => 14_000,  7  => 23_000,  8  => 34_000,
    9  => 48_000,  10 => 64_000,  11 => 85_000,  12 => 100_000,
    13 => 120_000, 14 => 140_000, 15 => 165_000, 16 => 195_000,
    17 => 225_000, 18 => 265_000, 19 => 305_000, 20 => 355_000
  }.freeze

  MAX_LEVEL = 20

  belongs_to :user
  has_many :player_character_items, dependent: :destroy

  validates :name, presence: true
  validates :archetype, presence: true, inclusion: { in: ArchetypeDefinitions::VALID_ARCHETYPES }
  validates :race, inclusion: { in: RaceDefinitions::VALID_RACES }

  before_validation :derive_icon_from_archetype
  before_create :set_default_xp_stats

  scope :for_owner, ->(user_or_id) { where(user_id: user_or_id.is_a?(User) ? user_or_id.id : user_or_id) }

  def self.provision_for(user)
    names = AVAILABLE_NAMES.sample(PROVISION_COUNT)

    transaction do
      names.map do |name|
        archetype = ArchetypeDefinitions::VALID_ARCHETYPES.sample
        base_hp   = ArchetypeDefinitions.stats_for(archetype)[:max_hp]
        pc = create!(user: user, name: name, archetype: archetype, locked: false, xp: 0, level: 1, max_hp: base_hp)
        pc.player_character_items.create!(item_slug: "shortsword", equipped: true)
        pc
      end
    end
  end

  def calculate_level
    XP_THRESHOLDS.select { |_lvl, threshold| xp >= threshold }.keys.max.clamp(1, MAX_LEVEL)
  end

  def award_xp!(amount)
    return if amount <= 0

    old_level = level
    new_xp    = xp + amount
    new_level = self.class.new(xp: new_xp).calculate_level

    updates = { xp: new_xp, level: new_level }

    if new_level > old_level
      base_max_hp  = ArchetypeDefinitions.stats_for(archetype)[:max_hp]
      hp_per_level = ArchetypeDefinitions.hit_die_for(archetype) / 2 + 1
      updates[:max_hp] = base_max_hp + (new_level - 1) * hp_per_level
    end

    update!(updates)
  end

  private

  def derive_icon_from_archetype
    self.icon = ArchetypeDefinitions.icon_for(archetype) if archetype.present?
  end

  def set_default_xp_stats
    self.xp    ||= 0
    self.level ||= 1
    self.max_hp ||= ArchetypeDefinitions.stats_for(archetype)[:max_hp] if archetype.present?
  end
end
