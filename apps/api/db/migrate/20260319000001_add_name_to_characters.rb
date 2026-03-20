class AddNameToCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :characters, :name, :string, null: false, default: ''
  end
end
