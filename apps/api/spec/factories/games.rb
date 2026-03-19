FactoryBot.define do
  factory :game do
    association :challenger, factory: :user
    association :challenged, factory: :user
    status { :pending }
    turn_time_limit { 3600 }
    board_config do
      {
        tiles: (1..12).map do |y|
          (1..12).map do |x|
            type = if [ [ 1, 1 ], [ 2, 1 ], [ 1, 2 ], [ 2, 2 ] ].include?([ x, y ])
              "spawn_challenger"
            elsif [ [ 11, 11 ], [ 12, 11 ], [ 11, 12 ], [ 12, 12 ] ].include?([ x, y ])
              "spawn_challenged"
            elsif [ [ 4, 3 ], [ 9, 3 ], [ 2, 5 ], [ 6, 5 ], [ 10, 5 ], [ 12, 5 ], [ 1, 7 ], [ 5, 7 ], [ 8, 7 ], [ 11, 7 ], [ 3, 9 ], [ 7, 9 ], [ 12, 9 ], [ 2, 10 ], [ 6, 11 ], [ 9, 12 ] ].include?([ x, y ])
              "blocked"
            else
              "open"
            end

            { type: type }
          end
        end
      }
    end
    lock_version { 0 }
  end
end
