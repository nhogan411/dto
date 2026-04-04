class MakeGameChallengerAndChallengedNullable < ActiveRecord::Migration[8.0]
  def change
    change_column_null :games, :challenger_id, true
    change_column_null :games, :challenged_id, true
  end
end
