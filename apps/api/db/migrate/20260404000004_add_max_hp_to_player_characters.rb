class AddMaxHpToPlayerCharacters < ActiveRecord::Migration[8.0]
  def up
    add_column :player_characters, :max_hp, :integer

    # Backfill existing records from archetype base HP
    execute <<-SQL
      UPDATE player_characters
      SET max_hp = CASE archetype
        WHEN 'warrior' THEN 16
        WHEN 'scout'   THEN 10
        ELSE 10
      END
    SQL

    change_column_null :player_characters, :max_hp, false
  end

  def down
    remove_column :player_characters, :max_hp
  end
end
