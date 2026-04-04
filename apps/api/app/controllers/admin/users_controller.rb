module Admin
  class UsersController < Admin::BaseController
    before_action :set_user, only: [ :show, :update, :destroy ]

    # GET /admin/users
    def index
      users = User.select(
        "users.*",
        "(SELECT COUNT(*) FROM games WHERE challenger_id = users.id OR challenged_id = users.id) AS games_count",
        "(SELECT COUNT(*) FROM games WHERE winner_id = users.id) AS wins",
        "(SELECT COUNT(*) FROM games WHERE (challenger_id = users.id OR challenged_id = users.id) AND status = #{Game.statuses[:forfeited]}) AS forfeits"
      ).order(created_at: :asc)

      render json: { data: users.map { |user| serialize_user(user) } }
    end

    # GET /admin/users/:id
    def show
      render json: { data: serialize_user_detail(@user) }
    end

    # PATCH/PUT /admin/users/:id
    def update
      if @user.update(user_params)
        render json: { data: serialize_user(@user) }
      else
        render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
      end
    end

    # DELETE /admin/users/:id
    def destroy
      if params[:id].to_i == current_user.id
        render json: { errors: [ "Cannot delete your own account" ] }, status: :unprocessable_entity
        return
      end

      @user.destroy!
      head :no_content
    end

    private

    def set_user
      @user = User.includes(:player_characters).find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { errors: [ "Not found" ] }, status: :not_found
    end

    def user_params
      params.require(:user).permit(:email, :username, :role)
    end

    def serialize_user(user)
      games_count = user.respond_to?(:games_count) ? user.games_count.to_i : Game.where("challenger_id = :id OR challenged_id = :id", id: user.id).count
      wins        = user.respond_to?(:wins)        ? user.wins.to_i        : Game.where(winner_id: user.id).count
      forfeits    = user.respond_to?(:forfeits)    ? user.forfeits.to_i    : Game.where("(challenger_id = :id OR challenged_id = :id) AND status = :status", id: user.id, status: Game.statuses[:forfeited]).count
      losses      = games_count - wins - forfeits

      user.as_json(only: [ :id, :email, :username, :role, :created_at ])
          .merge(
            games_count: games_count,
            wins: wins,
            losses: losses,
            forfeits: forfeits
          )
    end

    def serialize_user_detail(user)
      games = Game.where("challenger_id = :id OR challenged_id = :id", id: user.id)
      games_count = games.count
      wins        = games.where(winner_id: user.id).count
      forfeits    = games.where(status: :forfeited).count
      losses      = games_count - wins - forfeits

      characters = user.player_characters.map do |pc|
        pc.as_json(only: [ :id, :name, :archetype, :race, :level, :xp, :max_hp, :icon, :locked ])
      end

      winning_compositions = build_winning_compositions(user, games)

      user.as_json(only: [ :id, :email, :username, :role, :created_at ])
          .merge(
            games_count: games_count,
            wins: wins,
            losses: losses,
            forfeits: forfeits,
            characters: characters,
            winning_compositions: winning_compositions
          )
    end

    def build_winning_compositions(user, games)
      winning_games = games.where(winner_id: user.id)
        .where.not(challenger_picks: [], challenged_picks: [])

      pc_cache = PlayerCharacter.where(id: winning_games.flat_map { |g|
        g.challenger_id == user.id ? Array(g.challenger_picks) : Array(g.challenged_picks)
      }).index_by(&:id)

      composition_counts = Hash.new(0)

      winning_games.each do |game|
        picks = game.challenger_id == user.id ? Array(game.challenger_picks) : Array(game.challenged_picks)
        archetypes = picks.filter_map { |id| pc_cache[id]&.archetype }.sort
        composition_counts[archetypes] += 1
      end

      composition_counts
        .sort_by { |_, count| -count }
        .first(5)
        .map { |archetypes, count| { archetypes: archetypes, count: count } }
    end
  end
end
