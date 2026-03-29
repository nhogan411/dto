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
  belongs_to :user
  has_many :player_character_items, dependent: :destroy

  validates :name, presence: true
  validates :archetype, presence: true, inclusion: { in: ArchetypeDefinitions::VALID_ARCHETYPES }
  validates :race, inclusion: { in: RaceDefinitions::VALID_RACES }

  before_validation :derive_icon_from_archetype

  scope :for_owner, ->(user_or_id) { where(user_id: user_or_id.is_a?(User) ? user_or_id.id : user_or_id) }

  def self.provision_for(user)
    names = AVAILABLE_NAMES.sample(PROVISION_COUNT)

    transaction do
      names.map do |name|
        pc = create!(user: user, name: name, archetype: ArchetypeDefinitions::VALID_ARCHETYPES.sample, locked: false)
        pc.player_character_items.create!(item_slug: "shortsword", equipped: true)
        pc
      end
    end
  end

  private

  def derive_icon_from_archetype
    self.icon = ArchetypeDefinitions.icon_for(archetype) if archetype.present?
  end
end
