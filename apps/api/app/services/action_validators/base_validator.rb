module ActionValidators
  class BaseValidator
    class ValidationError < StandardError; end

    def initialize(game:, character:, action_data:, turn_context:)
      @game = game
      @character = character
      @action_data = (action_data || {}).with_indifferent_access
      @turn_context = (turn_context || {}).with_indifferent_access
    end

    def validate!
      validate_game_active!
      validate_character_ownership!
      validate_turn_ownership!
    end

    def valid?
      validate!
      true
    rescue ValidationError
      false
    end

    private

    attr_reader :game, :character, :action_data, :turn_context

    def validate_game_active!
      raise ValidationError, "Game is not active" unless game.active?
    end

    def validate_character_ownership!
      current_user_id = turn_context[:current_user_id]
      raise ValidationError, "Character does not belong to current user" if current_user_id.blank? || character.user_id != current_user_id
    end

    def validate_turn_ownership!
      acting_character = game.acting_character
      raise ValidationError, "It is not this character's turn" if acting_character.nil? || acting_character.id != character.id
    end

    def adjacent_cardinal?(from, to)
      dx = to[:x].to_i - from[:x].to_i
      dy = to[:y].to_i - from[:y].to_i
      dx.abs + dy.abs == 1
    end

     def other_characters
       game.game_characters.select { |c| c.id != character.id }
     end

    def normalize_position(position)
      position = (position || {}).to_h.with_indifferent_access
      {
        x: position[:x].to_i,
        y: position[:y].to_i
      }
    end
  end
end
