class RenameCharactersTableAndUpdateForeignKey < ActiveRecord::Migration[8.0]
  def up
    rename_table :characters, :game_characters
    remove_foreign_key :game_actions, column: :character_id
    rename_column :game_actions, :character_id, :game_character_id
    add_foreign_key :game_actions, :game_characters, column: :game_character_id
  end

  def down
    remove_foreign_key :game_actions, column: :game_character_id
    rename_column :game_actions, :game_character_id, :character_id
    rename_table :game_characters, :characters
    add_foreign_key :game_actions, :characters, column: :character_id
  end
end
