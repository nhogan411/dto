FactoryBot.define do
  factory :game do
    association :challenger, factory: :user
    association :challenged, factory: :user
    status { :pending }
    turn_time_limit { 3600 }
    board_config { { blocked_squares: [], start_positions: [ [ 1, 1 ], [ 8, 8 ] ] } }
    lock_version { 0 }
  end
end
