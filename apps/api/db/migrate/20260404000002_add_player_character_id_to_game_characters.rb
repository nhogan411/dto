class AddPlayerCharacterIdToGameCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :game_characters, :player_character_id, :bigint
    add_foreign_key :game_characters, :player_characters, on_delete: :nullify
    add_index :game_characters, :player_character_id
  end
end
