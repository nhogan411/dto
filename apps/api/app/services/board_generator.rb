require "set"

class BoardGenerator
  BOARD_RANGE = (1..8).freeze
  BLOCKED_SQUARE_COUNT = 16
  START_POSITION_OPTIONS = [
    [ [ 1, 1 ], [ 8, 8 ] ],
    [ [ 1, 8 ], [ 8, 1 ] ]
  ].freeze
  CARDINAL_DIRECTIONS = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ].freeze

  def self.call
    new.call
  end

  def call
    loop do
      start_positions = START_POSITION_OPTIONS.sample.map(&:dup)
      blocked_squares = available_squares(start_positions).sample(BLOCKED_SQUARE_COUNT)

      return {
        blocked_squares: blocked_squares,
        start_positions: start_positions
      } if fully_connected?(blocked_squares, start_positions)
    end
  end

  private

  def available_squares(start_positions)
    all_squares.reject { |square| start_positions.include?(square) }
  end

  def all_squares
    @all_squares ||= BOARD_RANGE.flat_map do |x|
      BOARD_RANGE.map { |y| [ x, y ] }
    end
  end

  def fully_connected?(blocked_squares, start_positions)
    blocked_set = blocked_squares.to_set
    open_square_count = all_squares.count { |square| !blocked_set.include?(square) }
    visited = flood_fill(start_positions.first, blocked_set)

    start_positions.all? { |position| visited.include?(position) } && visited.size == open_square_count
  end

  def flood_fill(start_position, blocked_set)
    visited = Set.new([ start_position ])
    queue = [ start_position ]

    until queue.empty?
      current_position = queue.shift

      neighbors_for(current_position).each do |neighbor|
        next if blocked_set.include?(neighbor) || visited.include?(neighbor)

        visited << neighbor
        queue << neighbor
      end
    end

    visited
  end

  def neighbors_for(position)
    x, y = position

    CARDINAL_DIRECTIONS.filter_map do |delta_x, delta_y|
      neighbor = [ x + delta_x, y + delta_y ]
      neighbor if on_board?(neighbor)
    end
  end

  def on_board?(position)
    x, y = position
    BOARD_RANGE.cover?(x) && BOARD_RANGE.cover?(y)
  end
end
