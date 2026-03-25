class Game < ApplicationRecord
  belongs_to :challenger, class_name: "User"
  belongs_to :challenged, class_name: "User"
  belongs_to :current_turn_user, class_name: "User", optional: true
  belongs_to :winner, class_name: "User", optional: true

  has_many :game_characters, dependent: :destroy
  has_many :game_actions, dependent: :destroy

   enum :status, { pending: 0, active: 1, completed: 2, forfeited: 3, accepted: 4, declined: 5 }

   validates :board_config, presence: true
  validate :different_players

  def acting_character
    game_characters.find_by(id: turn_order[current_turn_index])
  end

  def both_picked?
    challenger_picks.present? && challenged_picks.present?
  end

  private

  def different_players
    errors.add(:base, "challenger and challenged must be different users") if challenger_id == challenged_id
  end
end
