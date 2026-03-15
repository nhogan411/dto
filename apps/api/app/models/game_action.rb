class GameAction < ApplicationRecord
  belongs_to :game
  belongs_to :character

  enum :action_type, { move: 0, attack: 1, defend: 2, end_turn: 3 }

  validates :turn_number, presence: true, numericality: { greater_than: 0 }
  validates :sequence_number, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :action_data, exclusion: { in: [ nil ], message: "can't be nil" }

  before_update { raise ActiveRecord::ReadOnlyRecord }
  before_destroy { raise ActiveRecord::ReadOnlyRecord }
end
