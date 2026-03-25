FactoryBot.define do
  factory :game_character do
    association :game
    association :user
    position { { x: 1, y: 1 } }
    facing_tile { { x: 1, y: 2 } }
    current_hp { 10 }
    is_defending { false }
    max_hp { 10 }
    stats { {} }
  end
end
