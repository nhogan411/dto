class CreatePlayerCharacterItems < ActiveRecord::Migration[8.0]
  def change
    create_table :player_character_items do |t|
      t.references :player_character, null: false, foreign_key: true
      t.string :item_slug, null: false
      t.boolean :equipped, default: false, null: false
      t.timestamps
    end

    add_index :player_character_items, [ :player_character_id, :item_slug ], unique: true, name: "index_pc_items_on_pc_id_and_slug"
  end
end
