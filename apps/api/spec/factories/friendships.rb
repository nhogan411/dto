FactoryBot.define do
  factory :friendship do
    association :requester, factory: :user
    association :recipient, factory: :user
    status { :pending }
  end
end
