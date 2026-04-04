class AddXpAwardedToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :xp_awarded, :boolean, null: false, default: false
  end
end
