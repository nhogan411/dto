FactoryBot.define do
  factory :player_character do
    association :user
    sequence(:name) { |n| PlayerCharacter::AVAILABLE_NAMES[(n - 1) % PlayerCharacter::AVAILABLE_NAMES.length] }
    archetype { 'warrior' }
    locked { false }
    xp { 0 }
    level { 1 }
    max_hp { 16 }
  end
end
