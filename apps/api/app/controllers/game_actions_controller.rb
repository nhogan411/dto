class GameActionsController < ApplicationController
  include JwtAuthenticatable

  VALIDATOR_MAP = {
    "move" => ActionValidators::MoveValidator,
    "attack" => ActionValidators::AttackValidator,
    "defend" => ActionValidators::DefendValidator,
    "end_turn" => ActionValidators::EndTurnValidator
  }.freeze

  before_action :authenticate_user!

  def create
    action = nil
    game = nil
    game_over = false
    turn_changed = false

    ActiveRecord::Base.transaction do
      game = Game.lock.includes(:characters, :game_actions).find(params[:id])
      actor = actor_for(game)

      ensure_active_game!(game)
      ensure_player!(game)
      ensure_current_turn!(game)

      validate_combat_budget!(game, actor)

      validator = validator_for(game:, character: actor)
      validator.validate!

      turn_number = game.game_actions.where(action_type: :end_turn).count + 1
      sequence_number = sequence_number_for(game, turn_number)

      action_result = build_action_result(game:, actor:)
      apply_action!(game:, actor:, action_result:)

      game_over = game.completed?
      turn_changed = action_type_param == "end_turn" || action_type_param == "defend"

      action = game.game_actions.create!(
        character: actor,
        action_type: action_type_param,
        action_data: action_data_param,
        result_data: action_result,
        turn_number: turn_number,
        sequence_number: sequence_number
      )
    end

    TurnTimeoutJob.set(wait_until: game.turn_deadline).perform_later(game.id, game.turn_deadline.iso8601) if turn_changed

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
    game = Game.includes(:characters).find(params[:id])
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
    game = Game.includes(:characters).find(params[:id])
    actor = actor_for(game)
    ensure_active_game!(game)
    ensure_player!(game)

    target_character_id = params[:target_character_id].to_i
    target = game.characters.find_by(id: target_character_id)

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
    raise ActionValidators::BaseValidator::ValidationError, "You are not a player in this game" unless game.characters.exists?(user_id: current_user.id)
  end

  def ensure_current_turn!(game)
    actor = game.acting_character
    raise ActionValidators::BaseValidator::ValidationError, "It is not your turn" if actor.nil? || actor.user_id != current_user.id
  end

  def action_type_param
    @action_type_param ||= params[:action_type].to_s
  end

  def action_data_param
    raw = params[:action_data]
    return {} if raw.blank?

    raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h : raw
  end

  def validator_for(game:, character:)
    validator_class = VALIDATOR_MAP[action_type_param]
    raise ActionValidators::BaseValidator::ValidationError, "Unsupported action_type" unless validator_class

    validator_class.new(game:, character:, action_data: action_data_param, turn_context: turn_context_for(game, character))
  end

  def turn_context_for(game, character)
    current_turn_number = game.game_actions.where(action_type: :end_turn).count + 1
    actions_in_turn = game.game_actions.where(turn_number: current_turn_number, character_id: character.id)

    {
      current_user_id: current_user.id,
      moves_taken: actions_in_turn.where(action_type: :move).sum("jsonb_array_length(action_data->'path')"),
      has_attacked: actions_in_turn.where(character_id: character.id, action_type: :attack).exists?,
      has_defended: actions_in_turn.where(character_id: character.id, action_type: :defend).exists?,
      has_ended_turn: actions_in_turn.where(character_id: character.id, action_type: :end_turn).exists?
    }
  end

  def validate_combat_budget!(game, character)
    return unless action_type_param == "attack"

    current_turn_number = game.game_actions.where(action_type: :end_turn).count + 1
    defended = game.game_actions.where(turn_number: current_turn_number, character_id: character.id, action_type: :defend).exists?
    raise ActionValidators::BaseValidator::ValidationError, "Character has already defended this turn" if defended
  end

  def sequence_number_for(game, turn_number)
    game.game_actions.where(turn_number: turn_number).count + 1
  end

  def build_action_result(game:, actor:)
    case action_type_param
    when "move"
      build_move_result(actor)
    when "attack"
      build_attack_result(game:, actor:)
    when "defend"
      {}
    when "end_turn"
      next_index = compute_next_turn_index(game)
      next_character = next_index.nil? ? nil : game.characters.find_by(id: game.turn_order[next_index])

      {
        next_character_id: next_character&.id,
        turn_number: game.game_actions.where(action_type: :end_turn).count + 2
      }
    else
      {}
    end
  end

  def build_move_result(actor)
    from_position = actor.position.with_indifferent_access.slice(:x, :y)
    path = action_data_param.with_indifferent_access.fetch(:path, [])
    to_position = path.last.with_indifferent_access.slice(:x, :y)

    {
      from_position: from_position,
      to_position: to_position
    }
  end

  def build_attack_result(game:, actor:)
    target = game.characters.find(action_data_param[:target_character_id] || action_data_param["target_character_id"])
    success_rate = CombatCalculator.success_rate(
      actor.position.with_indifferent_access,
      actor.facing_tile.with_indifferent_access,
      target.position.with_indifferent_access,
      target.facing_tile.with_indifferent_access,
      target.is_defending
    )
    roll = CombatCalculator.roll_attack(success_rate, rand_val: action_data_param[:rand_val] || action_data_param["rand_val"])
    target_hp_remaining = [ target.current_hp - roll[:damage].to_i, 0 ].max
    direction = CombatCalculator.attack_direction(
      actor.position.with_indifferent_access,
      target.position.with_indifferent_access,
      target.facing_tile.with_indifferent_access
    )

    {
      hit: roll[:hit],
      critical: roll[:critical],
      damage: roll[:damage],
      roll: roll[:roll],
      threshold: success_rate,
      direction: direction.to_s,
      target_hp_remaining: target_hp_remaining,
      success_rate: success_rate,
      target_id: target.id
    }
  end

  def apply_action!(game:, actor:, action_result:)
    case action_type_param
    when "move"
      to_position = action_result[:to_position].with_indifferent_access
      actor.update!(position: { x: to_position[:x], y: to_position[:y] })
    when "attack"
      apply_attack!(game:, action_result:)
    when "defend"
      actor.update!(is_defending: true)
      apply_defend_turn_change!(game:, actor:)
    when "end_turn"
      apply_end_turn!(game:, actor:)
    end
  end

  def apply_attack!(game:, action_result:)
    target = game.characters.find(action_result[:target_id])
    target.update!(current_hp: action_result[:target_hp_remaining])

    return unless target.current_hp <= 0

    game.update!(status: :completed, winner_id: current_user.id)
  end

  def apply_end_turn!(game:, actor:)
    next_index = compute_next_turn_index(game)
    next_character = next_index.nil? ? nil : game.characters.find_by(id: game.turn_order[next_index])
    facing_tile = action_data_param.with_indifferent_access[:facing_tile].to_h.with_indifferent_access

    actor.update!(is_defending: false, facing_tile: { x: facing_tile[:x], y: facing_tile[:y] })
    next_character&.update!(is_defending: false)

    game.update!(
      current_turn_index: next_index || game.current_turn_index,
      turn_deadline: Time.current + game.turn_time_limit.seconds
    )
  end

  def apply_defend_turn_change!(game:, actor:)
    next_index = compute_next_turn_index(game)
    next_character = next_index.nil? ? nil : game.characters.find_by(id: game.turn_order[next_index])
    next_character&.update!(is_defending: false)

    game.update!(
      current_turn_index: next_index || game.current_turn_index,
      turn_deadline: Time.current + game.turn_time_limit.seconds
    )
  end

  def compute_next_turn_index(game)
    turn_order = game.turn_order
    turn_count = turn_order.length
    return nil if turn_count.zero?

    next_index = (game.current_turn_index + 1) % turn_count
    iterations = 0

    while (next_character = game.characters.find_by(id: turn_order[next_index])) && next_character.dead? && iterations < turn_count
      next_index = (next_index + 1) % turn_count
      iterations += 1
    end

    while game.characters.find_by(id: turn_order[next_index]).nil? && iterations < turn_count
      next_index = (next_index + 1) % turn_count
      iterations += 1
    end

    next_index
  end
end
