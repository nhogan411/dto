class ComputeNextTurnIndex
  def self.call(game)
    new(game).call
  end

  def initialize(game)
    @game = game
  end

  def call
    turn_order = @game.turn_order
    turn_count = turn_order.length
    return nil if turn_count.zero?

    next_index = (@game.current_turn_index + 1) % turn_count
    iterations = 0

    while iterations < turn_count
      character = @game.game_characters.find_by(id: turn_order[next_index])
      break if character && character.alive?

      next_index = (next_index + 1) % turn_count
      iterations += 1
    end

    next_index
  end
end
