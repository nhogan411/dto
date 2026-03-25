require "rails_helper"

RSpec.describe InitiativeService do
  describe ".roll" do
    it "returns character ids ordered by highest roll first" do
      characters = [
        instance_double(GameCharacter, id: 10),
        instance_double(GameCharacter, id: 20),
        instance_double(GameCharacter, id: 30)
      ]

      allow(described_class).to receive(:roll_d20).and_return(8, 19, 12)

      expect(described_class.roll(characters)).to eq([ 20, 30, 10 ])
    end

    it "re-rolls only tied characters until tie is resolved" do
      characters = [
        instance_double(GameCharacter, id: 10),
        instance_double(GameCharacter, id: 20),
        instance_double(GameCharacter, id: 30)
      ]

      allow(described_class).to receive(:roll_d20).and_return(
        15, 15, 9,
        7, 18
      )

      expect(described_class.roll(characters)).to eq([ 20, 30, 10 ])
      expect(described_class).to have_received(:roll_d20).exactly(5).times
    end

    it "is deterministic with stubbed rolls across multiple tie rounds" do
      characters = [
        instance_double(GameCharacter, id: 1),
        instance_double(GameCharacter, id: 2),
        instance_double(GameCharacter, id: 3),
        instance_double(GameCharacter, id: 4)
      ]

      allow(described_class).to receive(:roll_d20).and_return(
        14, 14, 14, 8,
        12, 12, 4,
        9, 19
      )

      expect(described_class.roll(characters)).to eq([ 2, 1, 4, 3 ])
      expect(described_class).to have_received(:roll_d20).exactly(9).times
    end

    it "returns empty array for empty character input" do
      expect(described_class.roll([])).to eq([])
    end
  end
end
