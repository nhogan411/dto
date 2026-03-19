class HardenPlayerCharacterConstraints < ActiveRecord::Migration[8.0]
  def change
    change_column_null :player_characters, :name, false
    change_column_null :player_characters, :icon, false
    change_column_default :player_characters, :locked, from: nil, to: false
    change_column_null :player_characters, :locked, false
  end
end
