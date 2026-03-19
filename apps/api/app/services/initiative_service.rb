class InitiativeService
  MAX_TIE_REROLL_ITERATIONS = 100

  def self.roll(characters)
    new(characters).roll
  end

  def self.roll_d20
    rand(1..20)
  end

  def initialize(characters)
    @characters = characters
  end

  def roll
    return [] if characters.empty?

    rolls = initial_rolls

    MAX_TIE_REROLL_ITERATIONS.times do
      tied_groups = tied_id_groups(rolls)
      break if tied_groups.empty?

      tied_groups.each do |ids|
        ids.each do |id|
          rolls[id] = self.class.roll_d20
        end
      end
    end

    rolls
      .sort_by { |id, value| [ -value, id ] }
      .map(&:first)
  end

  private

  attr_reader :characters

  def initial_rolls
    characters.each_with_object({}) do |character, memo|
      memo[character.id] = self.class.roll_d20
    end
  end

  def tied_id_groups(rolls)
    rolls
      .group_by { |_id, value| value }
      .values
      .select { |entries| entries.size > 1 }
      .map { |entries| entries.map(&:first) }
  end
end
