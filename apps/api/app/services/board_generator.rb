require "set"

class BoardGenerator
  BOARD_RANGE = (1..12).freeze
  BLOCKED_SQUARE_COUNT = 16
  START_POSITION_OPTIONS = [
    [ :top_left, :bottom_right ],
    [ :top_right, :bottom_left ]
  ].freeze
  CORNER_ZONES = {
    top_left: [ [ 1, 1 ], [ 2, 1 ], [ 1, 2 ], [ 2, 2 ] ],
    top_right: [ [ 11, 1 ], [ 12, 1 ], [ 11, 2 ], [ 12, 2 ] ],
    bottom_left: [ [ 1, 11 ], [ 2, 11 ], [ 1, 12 ], [ 2, 12 ] ],
    bottom_right: [ [ 11, 11 ], [ 12, 11 ], [ 11, 12 ], [ 12, 12 ] ]
  }.freeze
  CARDINAL_DIRECTIONS = [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ].freeze

  def self.call
    new.call
  end

  def call
    loop do
      challenger_spawn_tiles, challenged_spawn_tiles = selected_spawn_zones
      spawn_tiles = challenger_spawn_tiles + challenged_spawn_tiles
      blocked_squares = available_squares(spawn_tiles).sample(BLOCKED_SQUARE_COUNT)
      tiles = build_tiles(blocked_squares, challenger_spawn_tiles, challenged_spawn_tiles)

      return {
        tiles: tiles,
        "blocked_squares" => blocked_squares,
        "start_positions" => [
          legacy_start_position_for(challenger_spawn_tiles),
          legacy_start_position_for(challenged_spawn_tiles)
        ]
      } if fully_connected?(blocked_squares, challenger_spawn_tiles.first)
    end
  end

  private

  def selected_spawn_zones
    first_corner_name, second_corner_name = START_POSITION_OPTIONS.sample
    spawn_zone_options = [ CORNER_ZONES.fetch(first_corner_name), CORNER_ZONES.fetch(second_corner_name) ]

    spawn_zone_options.shuffle
  end

  def available_squares(spawn_tiles)
    all_squares.reject { |square| spawn_tiles.include?(square) }
  end

  def all_squares
    @all_squares ||= BOARD_RANGE.flat_map do |x|
      BOARD_RANGE.map { |y| [ x, y ] }
    end
  end

  def fully_connected?(blocked_squares, flood_fill_seed)
    blocked_set = blocked_squares.to_set
    open_square_count = all_squares.count { |square| !blocked_set.include?(square) }
    visited = flood_fill(flood_fill_seed, blocked_set)

    visited.size == open_square_count
  end

  def build_tiles(blocked_squares, challenger_spawn_tiles, challenged_spawn_tiles)
    blocked_set = blocked_squares.to_set
    challenger_set = challenger_spawn_tiles.to_set
    challenged_set = challenged_spawn_tiles.to_set

    BOARD_RANGE.map do |y|
      BOARD_RANGE.map do |x|
        {
          type: tile_type_for([ x, y ], blocked_set, challenger_set, challenged_set)
        }
      end
    end
  end

  def tile_type_for(position, blocked_set, challenger_set, challenged_set)
    return "blocked" if blocked_set.include?(position)
    return "spawn_challenger" if challenger_set.include?(position)
    return "spawn_challenged" if challenged_set.include?(position)

    "open"
  end

  def legacy_start_position_for(spawn_tiles)
    x = spawn_tiles.any? { |tile_x, _| tile_x == BOARD_RANGE.max } ? BOARD_RANGE.max : BOARD_RANGE.min
    y = spawn_tiles.any? { |_, tile_y| tile_y == BOARD_RANGE.max } ? BOARD_RANGE.max : BOARD_RANGE.min

    [ x, y ]
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
