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
    unless path.is_a?(Array) && path.any? && path.length <= movement_budget
      raise ValidationError, "Path must contain 1 to #{movement_budget} steps"
    end
  end

  def validate_move_budget!
    moves_taken = turn_context[:moves_taken].to_i
    raise ValidationError, "Move budget exceeded for this turn" if moves_taken + path.length > movement_budget
  end

  def movement_budget
    character.stats["movement"].to_i
  end

    def validate_steps!
      previous = normalize_position(character.position)
      others = other_characters
      end_positions = others.map { |c| normalize_position(c.position) }
      ally_positions = others.select { |c| c.user_id == character.user_id }.map { |c| normalize_position(c.position) }
      blocked = blocked_positions

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

        is_end_step = index == path.length - 1
        unless is_end_step
          opponent_positions = end_positions - ally_positions
          if opponent_positions.any? { |op| op[:x] == current[:x] && op[:y] == current[:y] }
            raise ValidationError, "Path cannot move through opponent position"
          end
        end

        if is_end_step
          if end_positions.any? { |op| op[:x] == current[:x] && op[:y] == current[:y] }
            raise ValidationError, "Path cannot end on an occupied tile"
          end
        end

        previous = current
      end
    end

    def path
      @path ||= action_data[:path]
    end

    def blocked_positions
      BoardConfig.blocked_positions(game.board_config)
    end
  end
end
