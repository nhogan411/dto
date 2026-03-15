class CreateFriendships < ActiveRecord::Migration[8.0]
  def change
    create_table :friendships do |t|
      t.integer :requester_id, null: false
      t.integer :recipient_id, null: false
      t.integer :status, null: false, default: 0

      t.timestamps
    end

    add_index :friendships, [ :requester_id, :recipient_id ], unique: true
    add_index :friendships, :recipient_id
    add_foreign_key :friendships, :users, column: :requester_id
    add_foreign_key :friendships, :users, column: :recipient_id
  end
end
