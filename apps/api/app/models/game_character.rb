class GameCharacter < ApplicationRecord
  belongs_to :game
  belongs_to :user

  has_many :game_actions, dependent: :destroy

  validates :current_hp, numericality: { greater_than_or_equal_to: 0 }
  validates :max_hp, numericality: { greater_than: 0 }
  validates :position, presence: true
  validates :facing_tile, presence: true

  def alive?
    current_hp > 0
  end

  def dead?
    !alive?
  end
end
