class CreatePlayerCharacters < ActiveRecord::Migration[8.0]
  def change
    create_table :player_characters do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :icon, null: false
      t.boolean :locked, null: false, default: false

      t.timestamps
    end
  end
end
