class AddIconToCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :characters, :icon, :string, null: false, default: 'warrior'
  end
end
