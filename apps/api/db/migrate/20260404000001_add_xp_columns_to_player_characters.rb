class AddXpColumnsToPlayerCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :player_characters, :xp, :integer, null: false, default: 0
    add_column :player_characters, :level, :integer, null: false, default: 1
  end
end
