FactoryBot.define do
  factory :game_action do
    association :game
    association :game_character
    action_type { :move }
    action_data { { from: { x: 1, y: 1 }, to: { x: 1, y: 2 } } }
    turn_number { 1 }
    sequence_number { 0 }
    result_data { {} }
  end
end
