class Game < ApplicationRecord
  belongs_to :challenger, class_name: "User"
  belongs_to :challenged, class_name: "User"
  belongs_to :current_turn_user, class_name: "User", optional: true
  belongs_to :winner, class_name: "User", optional: true

  has_many :characters, dependent: :destroy
  has_many :game_actions, dependent: :destroy

  enum :status, { pending: 0, active: 1, completed: 2, forfeited: 3 }

  validates :turn_time_limit, presence: true, inclusion: { in: [ 600, 3600, 7200, 86_400, 172_800, 604_800 ] }
  validates :board_config, presence: true
  validate :different_players

  private

  def different_players
    errors.add(:base, "challenger and challenged must be different users") if challenger_id == challenged_id
  end
end
