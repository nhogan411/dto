module Admin
  class StatsController < Admin::BaseController
    include WinningCompositions

    def index
      user_count  = User.count
      total_games = Game.count

      completed_and_forfeited = Game.where(status: [ :completed, :forfeited ]).count
      forfeited_count         = Game.where(status: :forfeited).count
      forfeit_rate            = completed_and_forfeited > 0 ? (forfeited_count.to_f / completed_and_forfeited).round(4) : 0.0

      avg_games_per_user = user_count > 0 ? (total_games.to_f / user_count).round(2) : 0.0

      users_with_no_games = User.where(
        "NOT EXISTS (SELECT 1 FROM games WHERE challenger_id = users.id OR challenged_id = users.id)"
      ).count

      top_users = User.select(
        "users.id, users.username,
         (SELECT COUNT(*) FROM games WHERE challenger_id = users.id OR challenged_id = users.id) AS games_count"
      ).order("games_count DESC").limit(5).map do |u|
        { id: u.id, username: u.username, games_count: u.games_count.to_i }
      end

      avg_level         = PlayerCharacter.average(:level)&.to_f&.round(2) || 0.0
      avg_level_by_arch = PlayerCharacter.group(:archetype).average(:level)
                            .transform_values { |v| v.to_f.round(2) }

      winning_games = Game.where(status: :completed).where.not(winner_id: nil)
      top_compositions = build_compositions(winning_games) { |g|
        g.winner_id == g.challenger_id ? Array(g.challenger_picks) : Array(g.challenged_picks)
      }

      render json: {
        data: {
          total_games:              total_games,
          active_games:             Game.where(status: :active).count,
          games_last_7_days:        Game.where("created_at >= ?", 7.days.ago).count,
          forfeit_rate:             forfeit_rate,
          avg_games_per_user:       avg_games_per_user,
          users_with_no_games:      users_with_no_games,
          avg_character_level:      avg_level,
          avg_level_by_archetype:   avg_level_by_arch,
          top_users_by_games:       top_users,
          top_winning_compositions: top_compositions
        }
      }
    end
  end
end
