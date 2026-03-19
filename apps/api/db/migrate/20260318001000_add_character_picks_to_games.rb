class AddCharacterPicksToGames < ActiveRecord::Migration[8.0]
  def change
    add_column :games, :challenger_picks, :jsonb, default: [], null: false
    add_column :games, :challenged_picks, :jsonb, default: [], null: false
  end
end
