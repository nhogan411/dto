class AddTurnColumnsToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :turn_order, :jsonb, default: []
    add_column :games, :current_turn_index, :integer, default: 0
  end
end
