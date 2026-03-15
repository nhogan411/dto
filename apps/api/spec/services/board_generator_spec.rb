require "rails_helper"
require "set"

RSpec.describe BoardGenerator do
  describe ".call" do
    it "always generates a connected board with 16 blocked squares" do
      100.times do
        board_config = described_class.call
        blocked_squares = board_config[:blocked_squares]
        start_positions = board_config[:start_positions]

        expect(blocked_squares.size).to eq(16)
        expect(blocked_squares.uniq.size).to eq(16)
        expect(start_positions).to satisfy do |positions|
          [ [ [ 1, 1 ], [ 8, 8 ] ], [ [ 1, 8 ], [ 8, 1 ] ] ].include?(positions)
        end
        expect((blocked_squares & start_positions)).to be_empty
        expect(fully_connected?(blocked_squares, start_positions)).to be(true)
      end
    end
  end

  def fully_connected?(blocked_squares, start_positions)
    blocked_set = blocked_squares.to_set
    all_squares = (1..8).flat_map do |x|
      (1..8).map { |y| [ x, y ] }
    end
    open_square_count = all_squares.count { |square| !blocked_set.include?(square) }
    visited = flood_fill(start_positions.first, blocked_set)

    start_positions.all? { |position| visited.include?(position) } && visited.size == open_square_count
  end

  def flood_fill(start_position, blocked_set)
    visited = Set.new([ start_position ])
    queue = [ start_position ]

    until queue.empty?
      x, y = queue.shift

      [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ].each do |delta_x, delta_y|
        neighbor = [ x + delta_x, y + delta_y ]

        next unless neighbor[0].between?(1, 8) && neighbor[1].between?(1, 8)
        next if blocked_set.include?(neighbor) || visited.include?(neighbor)

        visited << neighbor
        queue << neighbor
      end
    end

    visited
  end
end
