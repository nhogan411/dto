FactoryBot.define do
  factory :player_character_item do
    association :player_character
    item_slug { 'shortsword' }
    equipped { true }
  end
end
