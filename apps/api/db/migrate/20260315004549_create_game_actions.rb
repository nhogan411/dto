class CreateGameActions < ActiveRecord::Migration[8.0]
  def change
    create_table :game_actions do |t|
      t.references :game, null: false, foreign_key: true
      t.references :character, null: false, foreign_key: true
      t.integer :action_type, null: false
      t.jsonb :action_data, null: false, default: {}
      t.integer :turn_number, null: false
      t.integer :sequence_number, null: false
      t.jsonb :result_data, null: false, default: {}

      t.timestamps
    end

    add_index :game_actions, [ :game_id, :turn_number, :sequence_number ]
  end
end
