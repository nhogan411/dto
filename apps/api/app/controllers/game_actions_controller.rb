class GameActionsController < ApplicationController
  include JwtAuthenticatable

  ACTION_MAP = {
    "move"     => ActionValidators::MoveAction,
    "attack"   => ActionValidators::AttackAction,
    "defend"   => ActionValidators::DefendAction,
    "end_turn" => ActionValidators::EndTurnAction
  }.freeze

  before_action :authenticate_user!

  def create
    action = nil
    game = nil
    game_over = false
    turn_changed = false

    ActiveRecord::Base.transaction do
      game = Game.lock.includes(:game_characters, :game_actions).find(params[:id])
      actor = game.acting_character

      ensure_active_game!(game)
      ensure_player!(game)
      ensure_current_turn!(game)

      action_obj = build_action_object(game:, actor:)
      action_obj.validate!

      turn_number     = game.game_actions.where(action_type: :end_turn).count + 1
      sequence_number = game.game_actions.where(turn_number:).count + 1

      result = action_obj.build_result
      action_obj.apply!(result:)

      game_over = game.completed?
      turn_changed = %w[end_turn defend].include?(action_type_param)

      action = game.game_actions.create!(
        game_character:  actor,
        action_type:     action_type_param,
        action_data:     action_data_param,
        result_data:     result,
        turn_number:,
        sequence_number:
      )
    end

    Broadcaster.game_action_completed(game.reload, action)
    Broadcaster.turn_changed(game) if turn_changed
    Broadcaster.game_over(game) if game_over

    render json: {
      data: {
        action: action.as_json,
        game_state: GameStateService.new(game.reload).snapshot
      }
    }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [ "Game not found" ] }, status: :not_found
  rescue ActionValidators::BaseValidator::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_content
  end

  def index
    game = Game.includes(:game_characters).find(params[:id])
    ensure_player!(game)

    render json: {
      data: {
        actions: game.game_actions.order(:turn_number, :sequence_number).as_json
      }
    }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [ "Game not found" ] }, status: :not_found
  rescue ActionValidators::BaseValidator::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_content
  end

  def attack_preview
    game = Game.includes(:game_characters).find(params[:id])
    actor = actor_for(game)
    ensure_active_game!(game)
    ensure_player!(game)

    target_character_id = params[:target_character_id].to_i
    target = game.game_characters.find_by(id: target_character_id)

    raise ActionValidators::BaseValidator::ValidationError, "Target not found" unless target
    raise ActionValidators::BaseValidator::ValidationError, "Cannot preview attack on own character" if target.user_id == current_user.id
    raise ActionValidators::BaseValidator::ValidationError, "Target is not alive" unless target.alive?

    threshold = CombatCalculator.success_rate(
      actor.position.with_indifferent_access,
      actor.facing_tile.with_indifferent_access,
      target.position.with_indifferent_access,
      target.facing_tile.with_indifferent_access,
      target.is_defending
    )
    direction = CombatCalculator.attack_direction(
      actor.position.with_indifferent_access,
      target.position.with_indifferent_access,
      target.facing_tile.with_indifferent_access
    )
    hit_chance_percent = threshold > 20 ? 5 : [ ((21 - threshold) / 20.0 * 100).round, 5 ].max

    render json: {
      data: {
        direction: direction.to_s,
        threshold: threshold,
        hit_chance_percent: hit_chance_percent,
        is_defending: target.is_defending
      }
    }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [ "Game not found" ] }, status: :not_found
  rescue ActionValidators::BaseValidator::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_content
  end

  private

  def actor_for(game)
    game.acting_character
  end

  def ensure_active_game!(game)
    raise ActionValidators::BaseValidator::ValidationError, "Game is not active" unless game.active?
  end

  def ensure_player!(game)
    raise ActionValidators::BaseValidator::ValidationError, "You are not a player in this game" unless game.game_characters.exists?(user_id: current_user.id)
  end

  def ensure_current_turn!(game)
    actor = game.acting_character
    raise ActionValidators::BaseValidator::ValidationError, "It is not your turn" if actor.nil? || actor.user_id != current_user.id
  end

  def action_type_param
    @action_type_param ||= params[:action_type].to_s
  end

  def build_action_object(game:, actor:)
    action_class = ACTION_MAP[action_type_param]
    raise ActionValidators::BaseValidator::ValidationError, "Unsupported action_type" unless action_class

    action_class.new(
      game:,
      character: actor,
      action_data: action_data_param,
      turn_context: turn_context_for(game, actor),
      current_user:
    )
  end

  def action_data_param
    raw = params[:action_data]
    return {} if raw.blank?
    raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h : raw
  end

  def turn_context_for(game, character)
    current_turn_number = game.game_actions.where(action_type: :end_turn).count + 1
    actions_in_turn     = game.game_actions.where(turn_number: current_turn_number, game_character_id: character.id)

    {
      current_user_id: current_user.id,
      moves_taken:     actions_in_turn.where(action_type: :move).sum("jsonb_array_length(action_data->'path')"),
      has_attacked:    actions_in_turn.where(action_type: :attack).exists?,
      has_defended:    actions_in_turn.where(action_type: :defend).exists?,
      has_ended_turn:  actions_in_turn.where(action_type: :end_turn).exists?
    }
  end
end
