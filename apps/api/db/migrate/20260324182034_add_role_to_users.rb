class AddRoleToUsers < ActiveRecord::Migration[8.0]
  def up
    add_column :users, :role, :integer, null: false, default: 0
    add_index :users, :role
  end

  def down
    remove_index :users, :role
    remove_column :users, :role
  end
end
