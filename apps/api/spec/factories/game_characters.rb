FactoryBot.define do
  factory :game_character do
    association :game
    association :user
    position { { x: 1, y: 1 } }
    facing_tile { { x: 1, y: 2 } }
    current_hp { 10 }
    is_defending { false }
    max_hp { 10 }
    stats do
      {
        "movement" => 3,
        "str" => 14,
        "dex" => 8,
        "attack_stat" => "str",
        "ac" => 16,
        "damage_die" => 6,
        "proficiency_bonus" => 2,
        "level" => 1
      }
    end
  end
end
