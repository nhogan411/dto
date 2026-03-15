module ActionValidators
  class MoveValidator < BaseValidator
    def validate!
      super
      validate_path_shape!
      validate_move_budget!
      validate_steps!
    end

    private

    def validate_path_shape!
      unless path.is_a?(Array) && path.any? && path.length <= 3
        raise ValidationError, "Path must contain 1 to 3 steps"
      end
    end

    def validate_move_budget!
      moves_taken = turn_context[:moves_taken].to_i
      raise ValidationError, "Move budget exceeded for this turn" if moves_taken + path.length > 3
    end

    def validate_steps!
      previous = normalize_position(character.position)
      occupied = normalize_position(opponent_character&.position || {})
      blocked = blocked_squares

      path.each_with_index do |step, index|
        current = normalize_position(step)

        unless adjacent_cardinal?(previous, current)
          if index.zero?
            raise ValidationError, "First step must be adjacent to current position"
          end

          raise ValidationError, "Path must move in adjacent cardinal steps only"
        end

        if blocked.include?([ current[:x], current[:y] ])
          raise ValidationError, "Path cannot move through blocked squares"
        end

        if occupied[:x] == current[:x] && occupied[:y] == current[:y]
          raise ValidationError, "Path cannot move onto opponent position"
        end

        previous = current
      end
    end

    def path
      @path ||= action_data[:path]
    end

    def blocked_squares
      Array(game.board_config&.dig("blocked_squares")).map do |pair|
        [ pair[0].to_i, pair[1].to_i ]
      end
    end
  end
end
