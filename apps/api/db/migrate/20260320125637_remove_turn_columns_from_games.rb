class RemoveTurnColumnsFromGames < ActiveRecord::Migration[8.0]
  def up
    remove_column :games, :turn_time_limit
    remove_column :games, :turn_deadline
  end

  def down
    add_column :games, :turn_time_limit, :integer, null: false, default: 3600
    change_column_default :games, :turn_time_limit, nil
    add_column :games, :turn_deadline, :datetime
  end
end
