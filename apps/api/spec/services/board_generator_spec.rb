require "rails_helper"
require "set"

RSpec.describe BoardGenerator do
  TILE_TYPES = %w[open blocked spawn_challenger spawn_challenged].freeze
  CORNER_ZONES = [
    [ [ 1, 1 ], [ 2, 1 ], [ 1, 2 ], [ 2, 2 ] ],
    [ [ 11, 1 ], [ 12, 1 ], [ 11, 2 ], [ 12, 2 ] ],
    [ [ 1, 11 ], [ 2, 11 ], [ 1, 12 ], [ 2, 12 ] ],
    [ [ 11, 11 ], [ 12, 11 ], [ 11, 12 ], [ 12, 12 ] ]
  ].map(&:to_set).freeze

  OPPOSITE_CORNER_PAIRS = [
    [
      [ [ 1, 1 ], [ 2, 1 ], [ 1, 2 ], [ 2, 2 ] ],
      [ [ 11, 11 ], [ 12, 11 ], [ 11, 12 ], [ 12, 12 ] ]
    ],
    [
      [ [ 11, 1 ], [ 12, 1 ], [ 11, 2 ], [ 12, 2 ] ],
      [ [ 1, 11 ], [ 2, 11 ], [ 1, 12 ], [ 2, 12 ] ]
    ]
  ].map { |pair| pair.map(&:to_set) }.freeze

  describe ".call" do
    it "returns a tile-based board schema" do
      100.times do
        board_config = described_class.call
        expect(board_config).to include(:tiles)
        expect(board_config).not_to include(:blocked_squares)
        expect(board_config).not_to include(:start_positions)
      end
    end

    it "has exactly 12 rows and 12 columns" do
      100.times do
        board_config = described_class.call
        tiles = board_config[:tiles]

        expect(tiles).to be_an(Array)
        expect(tiles.size).to eq(12)
        expect(tiles).to all(satisfy { |row| row.is_a?(Array) && row.size == 12 })
      end
    end

    it "uses only valid tile types" do
      100.times do
        board_config = described_class.call
        board_config[:tiles].each do |row|
          row.each do |tile|
            expect(tile).to be_a(Hash)
            expect(tile).to include(:type)
            expect(TILE_TYPES).to include(tile[:type])
          end
        end
      end
    end

    it "maintains required tile counts" do
      100.times do
        board_config = described_class.call
        counts = tile_counts(board_config)

        expect(counts.fetch("blocked", 0)).to eq(16)
        expect(counts.fetch("spawn_challenger", 0)).to eq(4)
        expect(counts.fetch("spawn_challenged", 0)).to eq(4)
      end
    end

    it "assigns challenger spawn tiles to a valid corner 2x2" do
      100.times do
        board_config = described_class.call
        challenger_spawn_tiles = positions_for_type(board_config, "spawn_challenger")

        expect(challenger_spawn_tiles.size).to eq(4)
        expect(CORNER_ZONES).to include(challenger_spawn_tiles.to_set)
      end
    end

    it "assigns challenged spawn tiles to the opposite corner 2x2" do
      100.times do
        board_config = described_class.call
        challenger_spawn_tiles = positions_for_type(board_config, "spawn_challenger")
        challenged_spawn_tiles = positions_for_type(board_config, "spawn_challenged")

        expect(challenged_spawn_tiles.size).to eq(4)

        challenger_set = challenger_spawn_tiles.to_set
        challenged_set = challenged_spawn_tiles.to_set

        expect(OPPOSITE_CORNER_PAIRS).to include([ challenger_set, challenged_set ]).or include([ challenged_set, challenger_set ])
      end
    end

    it "ensures flood-fill connectivity from spawn_challenger reaches all non-blocked tiles" do
      100.times do
        board_config = described_class.call
        blocked_tiles = positions_for_type(board_config, "blocked")
        challenger_spawn_tiles = positions_for_type(board_config, "spawn_challenger")

        expect(challenger_spawn_tiles).not_to be_empty
        expect(fully_connected?(blocked_tiles, challenger_spawn_tiles.first)).to be(true)
      end
    end
  end

  describe "#on_board?" do
    let(:generator) { described_class.new }

    it "returns true for valid 12x12 board coordinates" do
      # Test corners
      expect(generator.send(:on_board?, [ 1, 1 ])).to be true
      expect(generator.send(:on_board?, [ 12, 12 ])).to be true
      expect(generator.send(:on_board?, [ 1, 12 ])).to be true
      expect(generator.send(:on_board?, [ 12, 1 ])).to be true

      # Test middle
      expect(generator.send(:on_board?, [ 6, 6 ])).to be true
      expect(generator.send(:on_board?, [ 1, 6 ])).to be true
      expect(generator.send(:on_board?, [ 12, 6 ])).to be true
    end

    it "returns false for coordinates outside 12x12 board" do
      # Outside upper bounds
      expect(generator.send(:on_board?, [ 13, 1 ])).to be false
      expect(generator.send(:on_board?, [ 1, 13 ])).to be false
      expect(generator.send(:on_board?, [ 13, 13 ])).to be false

      # Outside lower bounds
      expect(generator.send(:on_board?, [ 0, 1 ])).to be false
      expect(generator.send(:on_board?, [ 1, 0 ])).to be false
      expect(generator.send(:on_board?, [ 0, 0 ])).to be false
    end
  end

  private

  def tile_counts(board_config)
    board_config[:tiles].flatten.each_with_object(Hash.new(0)) do |tile, counts|
      counts[tile[:type]] += 1
    end
  end

  def positions_for_type(board_config, tile_type)
    board_config[:tiles].each_with_index.flat_map do |row, row_index|
      row.each_with_index.filter_map do |tile, column_index|
        [ column_index + 1, row_index + 1 ] if tile[:type] == tile_type
      end
    end
  end

  def fully_connected?(blocked_squares, start_position)
    blocked_set = blocked_squares.to_set
    all_squares = (1..12).flat_map do |x|
      (1..12).map { |y| [ x, y ] }
    end
    open_square_count = all_squares.count { |square| !blocked_set.include?(square) }
    visited = flood_fill(start_position, blocked_set)

    visited.size == open_square_count
  end

  def flood_fill(start_position, blocked_set)
    visited = Set.new([ start_position ])
    queue = [ start_position ]

    until queue.empty?
      x, y = queue.shift

      [ [ 1, 0 ], [ -1, 0 ], [ 0, 1 ], [ 0, -1 ] ].each do |delta_x, delta_y|
        neighbor = [ x + delta_x, y + delta_y ]

        next unless neighbor[0].between?(1, 12) && neighbor[1].between?(1, 12)
        next if blocked_set.include?(neighbor) || visited.include?(neighbor)

        visited << neighbor
        queue << neighbor
      end
    end

    visited
  end
end
