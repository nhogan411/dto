class AddExpiresAtToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :expires_at, :datetime
  end
end
