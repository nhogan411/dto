module ActionValidators
  class BaseAction
    attr_reader :game, :character, :action_data, :turn_context, :current_user

    def initialize(game:, character:, action_data:, turn_context:, current_user:)
      @game = game
      @character = character
      @action_data = action_data
      @turn_context = turn_context
      @current_user = current_user
    end

    def validate! = raise NotImplementedError
    def build_result = raise NotImplementedError
    def apply! = raise NotImplementedError
  end
end
