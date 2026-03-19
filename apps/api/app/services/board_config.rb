module BoardConfig
  TILE_TYPES = %w[open blocked spawn_challenger spawn_challenged].freeze

  def self.tile_at(board_config, x, y)
    board_config["tiles"][y - 1][x - 1]
  end

  def self.spawn_tiles(board_config, team)
    tile_type = "spawn_#{team}"

    board_config["tiles"].each_with_index.flat_map do |row, row_index|
      row.each_with_index.filter_map do |tile, column_index|
        [ column_index + 1, row_index + 1 ] if tile["type"] == tile_type
      end
    end
  end

  def self.blocked_positions(board_config)
    board_config["tiles"].each_with_index.flat_map do |row, row_index|
      row.each_with_index.filter_map do |tile, column_index|
        [ column_index + 1, row_index + 1 ] if tile["type"] == "blocked"
      end
    end
  end
end
