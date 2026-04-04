class GameCharacter < ApplicationRecord
  belongs_to :game
  belongs_to :user
  belongs_to :player_character, optional: true

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

  def stat_modifier(stat_name)
    stat_key = stat_name.to_s
    stat_value = stats[stat_key]
    raise ArgumentError, "Stat #{stat_key} missing from character stats" if stat_value.nil?

    (stat_value.to_i - 10) / 2
  end

  def attack_bonus
    attack_stat = stats["attack_stat"]
    raise ArgumentError, "attack_stat missing from character stats" if attack_stat.nil?

    proficiency_bonus = stats["proficiency_bonus"]
    raise ArgumentError, "proficiency_bonus missing from character stats" if proficiency_bonus.nil?

    stat_modifier(attack_stat) + proficiency_bonus.to_i
  end

  def effective_ac
    ac = stats["ac"]
    raise ArgumentError, "ac missing from character stats" if ac.nil?

    base_ac = ac.to_i
    is_defending ? base_ac + 2 : base_ac
  end

  def damage_die
    damage_die_value = stats["damage_die"]
    raise ArgumentError, "damage_die missing from character stats" if damage_die_value.nil?

    damage_die_value.to_i
  end
end
