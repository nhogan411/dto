class PlayerCharacterItem < ApplicationRecord
  belongs_to :player_character

  validates :item_slug, inclusion: { in: EquipmentDefinitions::VALID_ITEMS }
  validate :only_one_equipped_per_character, if: :equipped?

  private

  def only_one_equipped_per_character
    return if player_character.nil?

    existing = player_character.player_character_items
      .where(equipped: true)
      .where.not(id: id)
    errors.add(:equipped, "already has an equipped weapon") if existing.exists?
  end
end
