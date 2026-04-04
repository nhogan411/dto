require 'rails_helper'

RSpec.describe ArchetypeDefinitions do
  describe 'ARCHETYPES hit_die' do
    it 'provides hit_die: 10 for warrior' do
      expect(ArchetypeDefinitions::ARCHETYPES["warrior"][:hit_die]).to eq(10)
    end

    it 'provides hit_die: 8 for scout' do
      expect(ArchetypeDefinitions::ARCHETYPES["scout"][:hit_die]).to eq(8)
    end
  end
end
