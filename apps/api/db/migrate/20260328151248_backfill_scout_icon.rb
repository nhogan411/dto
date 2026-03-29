class BackfillScoutIcon < ActiveRecord::Migration[8.0]
  def up
    execute("UPDATE player_characters SET icon = 'scout' WHERE archetype = 'scout'")
  end

  def down
    execute("UPDATE player_characters SET icon = 'rogue' WHERE archetype = 'scout'")
  end
end
