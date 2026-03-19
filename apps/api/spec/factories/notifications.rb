FactoryBot.define do
  factory :notification do
    association :user
    event { "invite_expired" }
    data { {} }
    read_at { nil }
  end
end
