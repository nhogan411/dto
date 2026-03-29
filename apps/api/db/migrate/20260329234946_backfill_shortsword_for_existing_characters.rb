class BackfillShortswordForExistingCharacters < ActiveRecord::Migration[8.0]
  def up
    PlayerCharacter.find_each do |pc|
      unless PlayerCharacterItem.exists?(player_character_id: pc.id, item_slug: "shortsword")
        PlayerCharacterItem.create!(
          player_character_id: pc.id,
          item_slug: "shortsword",
          equipped: true
        )
      end
    end
  end

  def down
    PlayerCharacterItem.where(item_slug: "shortsword").delete_all
  end
end
