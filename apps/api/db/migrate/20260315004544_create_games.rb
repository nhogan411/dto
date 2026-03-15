class CreateGames < ActiveRecord::Migration[8.0]
  def change
    create_table :games do |t|
      t.integer :challenger_id, null: false
      t.integer :challenged_id, null: false
      t.integer :status, null: false, default: 0
      t.jsonb :board_config, null: false, default: {}
      t.integer :current_turn_user_id
      t.integer :turn_time_limit, null: false
      t.integer :winner_id
      t.datetime :turn_deadline
      t.integer :lock_version, null: false, default: 0

      t.timestamps
    end

    add_index :games, :challenger_id
    add_index :games, :challenged_id
    add_index :games, :current_turn_user_id
    add_index :games, :winner_id
    add_foreign_key :games, :users, column: :challenger_id
    add_foreign_key :games, :users, column: :challenged_id
    add_foreign_key :games, :users, column: :current_turn_user_id
    add_foreign_key :games, :users, column: :winner_id
  end
end
