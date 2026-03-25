class GameChannel < ApplicationCable::Channel
  def subscribed
    game = Game.includes(:game_characters, :game_actions).find_by(id: params[:game_id])
    return reject unless game && [ game.challenger_id, game.challenged_id ].include?(current_user.id)

    stream_for game
    transmit({ event: "connected", game_id: game.id, snapshot: GameStateService.new(game).snapshot })
  end

  def unsubscribed
    stop_all_streams
  end

  def submit_action(data)
    transmit({ event: "action_received", data: data })
  end

  def request_resync
    game = Game.includes(:game_characters, :game_actions).find_by(id: params[:game_id])
    return unless game

    transmit({ event: "resync", game_id: game.id, snapshot: GameStateService.new(game).snapshot })
  end
end
