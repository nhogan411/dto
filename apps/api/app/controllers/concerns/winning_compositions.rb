module WinningCompositions
  extend ActiveSupport::Concern

  private

  def build_compositions(winning_games, &winner_picks)
    pc_ids = winning_games.flat_map { |g| Array(winner_picks.call(g)) }.uniq
    pc_cache = PlayerCharacter.where(id: pc_ids).index_by(&:id)

    composition_counts = Hash.new(0)
    winning_games.each do |game|
      archetypes = Array(winner_picks.call(game)).filter_map { |id| pc_cache[id]&.archetype }.sort
      composition_counts[archetypes] += 1 unless archetypes.empty?
    end

    composition_counts
      .sort_by { |_, count| -count }
      .first(5)
      .map { |archetypes, count| { archetypes: archetypes, count: count } }
  end
end
