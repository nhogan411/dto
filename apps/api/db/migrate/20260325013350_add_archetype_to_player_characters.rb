class AddArchetypeToPlayerCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :player_characters, :archetype, :string, null: false, default: "warrior"
  end
end
