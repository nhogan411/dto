class CreateCharacters < ActiveRecord::Migration[8.0]
  def change
    create_table :characters do |t|
      t.references :game, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.jsonb :position, null: false, default: {}
      t.jsonb :facing_tile, null: false, default: {}
      t.integer :current_hp, null: false, default: 10
      t.boolean :is_defending, null: false, default: false
      t.integer :max_hp, null: false, default: 10
      t.jsonb :stats, null: false, default: {}

      t.timestamps
    end
  end
end
