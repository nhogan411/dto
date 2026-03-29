class AddRaceToPlayerCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :player_characters, :race, :string, null: false, default: "human"
  end
end
