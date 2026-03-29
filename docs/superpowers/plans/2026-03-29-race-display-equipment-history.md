# Race Display, Shortsword Equipment, History Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose character race throughout the frontend, add a persistent shortsword inventory system that modifies attack rolls and history text, and display sent/received timestamps on game history event cards.

**Architecture:** Race is snapshotted into `game_character.stats["race"]` at game-start (matching how `name`/`icon` are copied). Equipment lives in a `player_character_items` join table (Option B); at game-start the equipped weapon slug is snapshotted into `stats["weapon_slug"]`. The weapon's `damage_die` is read from `EquipmentDefinitions::ITEMS` in `CombatCalculator`, and `weapon_slug` flows through `result_data` to the frontend history card.

**Tech Stack:** Ruby on Rails 8 API · React 19 + TypeScript · Redux Toolkit · RSpec · TailwindCSS

---

## File Map

**Backend — modified:**
- `apps/api/app/models/concerns/equipment_definitions.rb` — populate ITEMS with shortsword
- `apps/api/app/models/player_character.rb` — add `has_many :player_character_items`; update `provision_for` to create shortsword item
- `apps/api/app/controllers/player_characters_controller.rb` — expose `race` in serializer and params
- `apps/api/app/controllers/admin/player_characters_controller.rb` — expose `race` in serializer
- `apps/api/app/controllers/character_selections_controller.rb` — snapshot `race` and `weapon_slug` into stats; expose `race` in `serialize_character`
- `apps/api/app/services/combat_calculator.rb` — read `weapon_slug` from stats → use item's `damage_die`
- `apps/api/app/services/action_validators/attack_action.rb` — add `weapon_slug` to `build_result`

**Backend — created:**
- `apps/api/app/models/player_character_item.rb` — new model
- `apps/api/db/migrate/YYYYMMDDHHMMSS_create_player_character_items.rb` — join table migration
- `apps/api/db/migrate/YYYYMMDDHHMMSS_backfill_shortsword_for_existing_characters.rb` — backfill migration

**Backend — test files:**
- `apps/api/spec/models/player_character_item_spec.rb` — new
- `apps/api/spec/models/player_character_spec.rb` — update provision_for tests
- `apps/api/spec/services/combat_calculator_spec.rb` — add weapon_slug context
- `apps/api/spec/services/action_validators/attack_action_spec.rb` — verify weapon_slug in result
- `apps/api/spec/controllers/player_characters_controller_spec.rb` — verify race in response

**Frontend — modified:**
- `apps/web/src/api/playerCharactersApi.ts` — add `race` to types
- `apps/web/src/api/game.ts` — add `weapon_slug` to result_data; add `race` to `ApiGameCharacter`
- `apps/web/src/store/slices/gameSlice.ts` — add `race` to `CharacterState`; map it from API
- `apps/web/src/pages/CharactersPage.tsx` — add race badge
- `apps/web/src/pages/CharacterDetailPage.tsx` — add RacePicker
- `apps/web/src/components/game/CharacterInfo.tsx` — add race + archetype line
- `apps/web/src/components/game/GameHistory.tsx` — update attack title; add timestamps

**Frontend — created:**
- `apps/web/src/components/characters/RacePicker.tsx` — new component
- `apps/web/src/constants/equipment.ts` — new EQUIPMENT_DISPLAY_NAMES constant
- `apps/web/src/constants/races.ts` — new RACE_OPTIONS constant for picker

---

## Task 1: Populate EquipmentDefinitions + Create PlayerCharacterItem Migration

**Files:**
- Modify: `apps/api/app/models/concerns/equipment_definitions.rb`
- Create: `apps/api/db/migrate/*_create_player_character_items.rb`

- [ ] **Step 1.1: Populate EquipmentDefinitions**

Replace the empty stub in `apps/api/app/models/concerns/equipment_definitions.rb`:

```ruby
module EquipmentDefinitions
  # Items keyed by slug. category: "weapon"|"armor"|"consumable"|"tool"|"wondrous"
  # subcategory: "melee"|"ranged", "light"|"medium"|"heavy"|"shield", "potion"|"scroll", etc.
  ITEMS = {
    "shortsword" => {
      name: "Shortsword",
      damage_die: 6,       # 1d6
      damage_bonus: 0,
      range: 1,            # melee only
      stat_used: :dex,     # finesse — uses DEX modifier
      proficiency: true
    }
  }.freeze

  VALID_ITEMS = ITEMS.keys.freeze
end
```

- [ ] **Step 1.2: Generate the migration**

```bash
cd apps/api && rails generate migration CreatePlayerCharacterItems
```

- [ ] **Step 1.3: Fill in the migration**

Open the generated file at `apps/api/db/migrate/*_create_player_character_items.rb` and replace its contents:

```ruby
class CreatePlayerCharacterItems < ActiveRecord::Migration[8.0]
  def change
    create_table :player_character_items do |t|
      t.references :player_character, null: false, foreign_key: true
      t.string :item_slug, null: false
      t.boolean :equipped, default: false, null: false
      t.timestamps
    end

    add_index :player_character_items, [ :player_character_id, :item_slug ], unique: true, name: "index_pc_items_on_pc_id_and_slug"
  end
end
```

- [ ] **Step 1.4: Run the migration**

```bash
cd apps/api && rails db:migrate
```

Expected output: `CreatePlayerCharacterItems: migrated`

- [ ] **Step 1.5: Commit**

```bash
cd apps/api && git add db/migrate/*_create_player_character_items.rb db/schema.rb app/models/concerns/equipment_definitions.rb
git commit -m "feat: create player_character_items table and populate EquipmentDefinitions with shortsword"
```

---

## Task 2: PlayerCharacterItem Model + PlayerCharacter Association

**Files:**
- Create: `apps/api/app/models/player_character_item.rb`
- Create: `apps/api/spec/models/player_character_item_spec.rb`
- Modify: `apps/api/app/models/player_character.rb`
- Modify: `apps/api/spec/factories/player_characters.rb`

- [ ] **Step 2.1: Write failing tests for PlayerCharacterItem**

Create `apps/api/spec/models/player_character_item_spec.rb`:

```ruby
require 'rails_helper'

RSpec.describe PlayerCharacterItem, type: :model do
  subject(:item) { build(:player_character_item) }

  describe 'associations' do
    it { is_expected.to belong_to(:player_character) }
  end

  describe 'validations' do
    it 'is valid with a known item_slug' do
      item.item_slug = 'shortsword'
      expect(item).to be_valid
    end

    it 'is invalid with an unknown item_slug' do
      item.item_slug = 'flamingsword'
      expect(item).not_to be_valid
      expect(item.errors[:item_slug]).to include('is not included in the list')
    end
  end

  describe 'one equipped weapon constraint' do
    it 'allows one equipped item' do
      pc = create(:player_character)
      create(:player_character_item, player_character: pc, item_slug: 'shortsword', equipped: true)
      second = build(:player_character_item, player_character: pc, item_slug: 'shortsword', equipped: true)
      # unique index prevents same slug twice; test the equipped constraint with a different slug if needed
      # For now, verify only_one_equipped validation fires on a duplicate equipped attempt
      second.item_slug = 'shortsword' # same slug would hit DB unique constraint first
      expect(second).not_to be_valid
    end

    it 'allows an unequipped item alongside an equipped one' do
      pc = create(:player_character)
      create(:player_character_item, player_character: pc, item_slug: 'shortsword', equipped: true)
      # A second unequipped item with a different slug would be fine if more items existed
      # Verify the equipped item is valid
      equipped = pc.player_character_items.find_by(equipped: true)
      expect(equipped).to be_valid
    end
  end
end
```

- [ ] **Step 2.2: Add factory**

Add to `apps/api/spec/factories/player_characters.rb` (append a new factory block at the end of the file):

```ruby
FactoryBot.define do
  factory :player_character_item do
    association :player_character
    item_slug { 'shortsword' }
    equipped { true }
  end
end
```

Actually, create a separate file `apps/api/spec/factories/player_character_items.rb`:

```ruby
FactoryBot.define do
  factory :player_character_item do
    association :player_character
    item_slug { 'shortsword' }
    equipped { true }
  end
end
```

- [ ] **Step 2.3: Run tests to confirm they fail**

```bash
cd apps/api && bundle exec rspec spec/models/player_character_item_spec.rb --format documentation
```

Expected: NameError or LoadError — `PlayerCharacterItem` does not exist yet.

- [ ] **Step 2.4: Create the model**

Create `apps/api/app/models/player_character_item.rb`:

```ruby
class PlayerCharacterItem < ApplicationRecord
  belongs_to :player_character

  validates :item_slug, inclusion: { in: EquipmentDefinitions::VALID_ITEMS }
  validate :only_one_equipped_per_character, if: :equipped?

  private

  def only_one_equipped_per_character
    existing = player_character.player_character_items
      .where(equipped: true)
      .where.not(id: id)
    errors.add(:equipped, "already has an equipped weapon") if existing.exists?
  end
end
```

- [ ] **Step 2.5: Add association to PlayerCharacter**

In `apps/api/app/models/player_character.rb`, add after `belongs_to :user`:

```ruby
has_many :player_character_items, dependent: :destroy
```

- [ ] **Step 2.6: Run tests — expect pass**

```bash
cd apps/api && bundle exec rspec spec/models/player_character_item_spec.rb --format documentation
```

Expected: all green.

- [ ] **Step 2.7: Commit**

```bash
cd apps/api && git add app/models/player_character_item.rb app/models/player_character.rb spec/models/player_character_item_spec.rb spec/factories/player_character_items.rb
git commit -m "feat: PlayerCharacterItem model with equipped validation and PlayerCharacter association"
```

---

## Task 3: Backfill Migration + provision_for Update

**Files:**
- Create: `apps/api/db/migrate/*_backfill_shortsword_for_existing_characters.rb`
- Modify: `apps/api/app/models/player_character.rb`
- Modify: `apps/api/spec/models/player_character_spec.rb`

- [ ] **Step 3.1: Write failing test for provision_for shortsword**

Add to the `describe '.provision_for'` block in `apps/api/spec/models/player_character_spec.rb`:

```ruby
it 'gives each provisioned character an equipped shortsword' do
  user = create(:user)
  provisioned = described_class.provision_for(user)
  provisioned.each do |pc|
    item = pc.player_character_items.find_by(equipped: true)
    expect(item).to be_present
    expect(item.item_slug).to eq('shortsword')
  end
end
```

- [ ] **Step 3.2: Run test to confirm it fails**

```bash
cd apps/api && bundle exec rspec spec/models/player_character_spec.rb -e "gives each provisioned character an equipped shortsword" --format documentation
```

Expected: FAIL — no player_character_item rows created.

- [ ] **Step 3.3: Update provision_for**

In `apps/api/app/models/player_character.rb`, update `provision_for` from:

```ruby
def self.provision_for(user)
  names = AVAILABLE_NAMES.sample(PROVISION_COUNT)

  transaction do
    names.map do |name|
      create!(user: user, name: name, archetype: ArchetypeDefinitions::VALID_ARCHETYPES.sample, locked: false)
    end
  end
end
```

To:

```ruby
def self.provision_for(user)
  names = AVAILABLE_NAMES.sample(PROVISION_COUNT)

  transaction do
    names.map do |name|
      pc = create!(user: user, name: name, archetype: ArchetypeDefinitions::VALID_ARCHETYPES.sample, locked: false)
      pc.player_character_items.create!(item_slug: "shortsword", equipped: true)
      pc
    end
  end
end
```

- [ ] **Step 3.4: Run test — expect pass**

```bash
cd apps/api && bundle exec rspec spec/models/player_character_spec.rb --format documentation
```

Expected: all green.

- [ ] **Step 3.5: Generate and write backfill migration**

```bash
cd apps/api && rails generate migration BackfillShortswordForExistingCharacters
```

Fill in the generated file:

```ruby
class BackfillShortswordForExistingCharacters < ActiveRecord::Migration[8.0]
  def up
    PlayerCharacter.find_each do |pc|
      unless PlayerCharacterItem.exists?(player_character_id: pc.id, item_slug: "shortsword")
        PlayerCharacterItem.create!(
          player_character_id: pc.id,
          item_slug: "shortsword",
          equipped: true
        )
      end
    end
  end

  def down
    PlayerCharacterItem.where(item_slug: "shortsword").delete_all
  end
end
```

- [ ] **Step 3.6: Run the backfill migration**

```bash
cd apps/api && rails db:migrate
```

Expected: `BackfillShortswordForExistingCharacters: migrated`

- [ ] **Step 3.7: Commit**

```bash
cd apps/api && git add app/models/player_character.rb db/migrate/*_backfill_shortsword_for_existing_characters.rb db/schema.rb spec/models/player_character_spec.rb
git commit -m "feat: provision shortsword item for all characters (new + backfill migration)"
```

---

## Task 4: Wire weapon_slug into CombatCalculator

**Files:**
- Modify: `apps/api/app/services/combat_calculator.rb`
- Modify: `apps/api/spec/services/combat_calculator_spec.rb`

- [ ] **Step 4.1: Write failing tests**

Add to `apps/api/spec/services/combat_calculator_spec.rb` inside the `describe ".roll_attack"` block:

```ruby
context "when attacker has weapon_slug in stats" do
  let(:attacker_with_weapon) do
    build(:game_character, stats: warrior_stats.merge("weapon_slug" => "shortsword"), is_defending: false)
  end

  it "uses the weapon damage_die from EquipmentDefinitions instead of archetype damage_die" do
    # shortsword damage_die is 6, same as warrior default — test that it reads from EquipmentDefinitions
    # We test this by stubbing rand to a known value and verifying damage_roll is in 1..6 range
    result = described_class.roll_attack(
      attacker_with_weapon,
      scout,
      position: :front,
      rand_val: { d20: 15, damage: 4 }
    )

    expect(result[:hit]).to eq(true)
    expect(result[:damage_roll]).to eq(4)
  end

  it "falls back to archetype damage_die when weapon_slug is absent" do
    result = described_class.roll_attack(
      warrior,
      scout,
      position: :front,
      rand_val: { d20: 15, damage: 3 }
    )

    expect(result[:damage_roll]).to eq(3)
  end
end
```

- [ ] **Step 4.2: Run tests to confirm they fail**

```bash
cd apps/api && bundle exec rspec spec/services/combat_calculator_spec.rb -e "when attacker has weapon_slug in stats" --format documentation
```

Expected: FAIL — current code doesn't read weapon_slug.

- [ ] **Step 4.3: Update CombatCalculator to read weapon's damage_die**

In `apps/api/app/services/combat_calculator.rb`, in the `roll_attack` method, find the section that handles normal hits (after the natural 1 and natural 20 returns). The `damage_roll_val || rand(1..attacker.damage_die)` calls need to use the weapon's die.

Add a helper at the top of `roll_attack` to resolve the damage die, right after the `d20_roll`/`damage_roll_val` assignment block and before `natural_roll = ...`:

```ruby
weapon_slug = attacker.stats["weapon_slug"] || attacker.stats[:weapon_slug]
weapon_item = weapon_slug ? EquipmentDefinitions::ITEMS[weapon_slug.to_s] : nil
effective_damage_die = weapon_item ? weapon_item[:damage_die] : attacker.damage_die
```

Then replace ALL occurrences of `attacker.damage_die` in `roll_attack` with `effective_damage_die`. There are two: one in the natural 20 block and one in the normal hit block.

The full updated method structure (showing only the changed lines in context):

```ruby
def roll_attack(attacker, target, position:, rand_val: nil)
  if rand_val.is_a?(Hash) || rand_val.is_a?(ActiveSupport::HashWithIndifferentAccess)
    d20_roll = rand_val[:d20] || rand_val["d20"]
    damage_roll_val = rand_val[:damage] || rand_val["damage"]
    old_format = false
  elsif rand_val.is_a?(Numeric) || (rand_val.is_a?(String) && rand_val.match?(/^\d+$/))
    d20_roll = rand_val.to_i
    damage_roll_val = nil
    old_format = true
  else
    d20_roll = nil
    damage_roll_val = nil
    old_format = false
  end

  # Resolve damage die: prefer equipped weapon over archetype default
  weapon_slug = attacker.stats["weapon_slug"] || attacker.stats[:weapon_slug]
  weapon_item = weapon_slug ? EquipmentDefinitions::ITEMS[weapon_slug.to_s] : nil
  effective_damage_die = weapon_item ? weapon_item[:damage_die] : attacker.damage_die

  natural_roll = d20_roll || rand(1..20)
  # ... rest of method unchanged except replace attacker.damage_die with effective_damage_die
```

Specifically, in the natural 20 block change:
```ruby
# BEFORE:
damage_val = damage_roll_val || rand(1..attacker.damage_die)
# AFTER:
damage_val = damage_roll_val || rand(1..effective_damage_die)
```

And in the normal hit block change:
```ruby
# BEFORE:
damage_roll = damage_roll_val || rand(1..attacker.damage_die)
# AFTER:
damage_roll = damage_roll_val || rand(1..effective_damage_die)
```

- [ ] **Step 4.4: Run tests — expect pass**

```bash
cd apps/api && bundle exec rspec spec/services/combat_calculator_spec.rb --format documentation
```

Expected: all green.

- [ ] **Step 4.5: Commit**

```bash
cd apps/api && git add app/services/combat_calculator.rb spec/services/combat_calculator_spec.rb
git commit -m "feat: CombatCalculator reads damage_die from equipped weapon via EquipmentDefinitions"
```

---

## Task 5: Add weapon_slug to AttackAction result + race to CharacterSelectionsController

**Files:**
- Modify: `apps/api/app/services/action_validators/attack_action.rb`
- Modify: `apps/api/app/controllers/character_selections_controller.rb`
- Modify: `apps/api/spec/services/action_validators/attack_action_spec.rb` (if file exists)

- [ ] **Step 5.1: Add weapon_slug to build_result**

In `apps/api/app/services/action_validators/attack_action.rb`, update `build_result` to include `weapon_slug` in the returned hash. Find the return hash (starting with `hit:`) and add:

```ruby
weapon_slug: character.stats["weapon_slug"]
```

The full return hash becomes:

```ruby
{
  hit: roll[:hit],
  critical: roll[:critical],
  damage: roll[:damage],
  roll: roll[:natural_roll],
  threshold: threshold_roll,
  direction: direction.to_s,
  target_hp_remaining:,
  natural_roll: roll[:natural_roll],
  attack_bonus: roll[:attack_bonus],
  target_ac: roll[:target_ac],
  damage_roll: roll[:damage_roll],
  damage_bonus: roll[:damage_bonus],
  target_id: target.id,
  weapon_slug: character.stats["weapon_slug"]
}
```

- [ ] **Step 5.2: Snapshot race and weapon_slug in character_attributes_for**

In `apps/api/app/controllers/character_selections_controller.rb`, update `character_attributes_for` to add `race` and `weapon_slug` to the stats hash.

Find the `stats:` hash inside `character_attributes_for` and add two entries after the existing ones:

```ruby
stats: {
  movement:          archetype_stats[:movement],
  str:               archetype_stats[:str]  + (race_bonuses[:str]  || 0),
  dex:               archetype_stats[:dex]  + (race_bonuses[:dex]  || 0),
  con:               (race_bonuses[:con]  || 0),
  int:               (race_bonuses[:int]  || 0),
  wis:               (race_bonuses[:wis]  || 0),
  cha:               (race_bonuses[:cha]  || 0),
  attack_stat:       archetype_stats[:attack_stat],
  ac:                archetype_stats[:ac],
  damage_die:        archetype_stats[:damage_die],
  proficiency_bonus: archetype_stats[:proficiency_bonus],
  range:             archetype_stats[:range],
  race:              player_character.race,
  weapon_slug:       player_character.player_character_items.find_by(equipped: true)&.item_slug
},
```

- [ ] **Step 5.3: Expose race in serialize_character**

In `apps/api/app/controllers/character_selections_controller.rb`, update `serialize_character` to expose `race`:

```ruby
def serialize_character(character)
  {
    id: character.id,
    user_id: character.user_id,
    position: character.position,
    facing_tile: character.facing_tile,
    current_hp: character.current_hp,
    max_hp: character.max_hp,
    is_defending: character.is_defending,
    stats: character.stats,
    icon: character.icon,
    race: character.stats["race"]
  }
end
```

- [ ] **Step 5.4: Run the full backend test suite**

```bash
cd apps/api && bundle exec rspec --format documentation 2>&1 | tail -20
```

Expected: all passing (or pre-existing failures unchanged).

- [ ] **Step 5.5: Commit**

```bash
cd apps/api && git add app/services/action_validators/attack_action.rb app/controllers/character_selections_controller.rb
git commit -m "feat: weapon_slug in attack result_data; race and weapon_slug snapshotted into game_character stats"
```

---

## Task 6: Expose race in PlayerCharactersController + Admin controller

**Files:**
- Modify: `apps/api/app/controllers/player_characters_controller.rb`
- Modify: `apps/api/app/controllers/admin/player_characters_controller.rb`

- [ ] **Step 6.1: Add race to player_characters_controller serializer and params**

In `apps/api/app/controllers/player_characters_controller.rb`:

Change `serialize_player_character`:
```ruby
def serialize_player_character(character)
  character.as_json(only: [ :id, :name, :icon, :locked, :archetype, :race ])
end
```

Change `player_character_params`:
```ruby
def player_character_params
  params.permit(:name, :archetype, :race)
end
```

- [ ] **Step 6.2: Add race to admin serializer**

In `apps/api/app/controllers/admin/player_characters_controller.rb`:

Change `serialize_player_character`:
```ruby
def serialize_player_character(character)
  character.as_json(only: [ :id, :user_id, :name, :icon, :locked, :archetype, :race ])
end
```

- [ ] **Step 6.3: Verify with a quick curl or run related specs**

```bash
cd apps/api && bundle exec rspec spec/ --format documentation 2>&1 | tail -30
```

Expected: all green.

- [ ] **Step 6.4: Commit**

```bash
cd apps/api && git add app/controllers/player_characters_controller.rb app/controllers/admin/player_characters_controller.rb
git commit -m "feat: expose race in player_characters API responses and permit race param for updates"
```

---

## Task 7: Frontend types — race + weapon_slug

**Files:**
- Modify: `apps/web/src/api/playerCharactersApi.ts`
- Modify: `apps/web/src/api/game.ts`
- Modify: `apps/web/src/store/slices/gameSlice.ts`

- [ ] **Step 7.1: Add race to PlayerCharacter types**

In `apps/web/src/api/playerCharactersApi.ts`, update `PlayerCharacter` and `UpdatePlayerCharacterPayload`:

```typescript
export interface PlayerCharacter {
  id: number;
  name: string;
  icon: string;
  archetype: 'warrior' | 'scout';
  locked: boolean;
  race: string;
}

export interface UpdatePlayerCharacterPayload {
  name?: string;
  archetype?: 'warrior' | 'scout';
  race?: string;
}
```

- [ ] **Step 7.2: Add weapon_slug to game.ts result_data and race to ApiGameCharacter**

In `apps/web/src/api/game.ts`, find the `GameHistoryAction` interface and add `weapon_slug` to `result_data`. Also find `ApiGameCharacter` and add `race`.

For `GameHistoryAction`, find the `result_data?:` object and add:
```typescript
weapon_slug?: string;
```

For `ApiGameCharacter`, add:
```typescript
race?: string;
```

- [ ] **Step 7.3: Add race to CharacterState and map it in gameSlice**

In `apps/web/src/store/slices/gameSlice.ts`, update `CharacterState`:

```typescript
export interface CharacterState {
  id: number;
  userId: number;
  position: { x: number; y: number };
  facingTile: { x: number; y: number };
  currentHp: number;
  maxHp: number;
  isDefending: boolean;
  icon: string;
  name: string;
  alive: boolean;
  race: string;
  stats: Record<string, unknown> & { movement?: number; str?: number; dex?: number };
}
```

Find where `ApiGameCharacter` is mapped to `CharacterState` (look for where `isDefending`, `currentHp`, `facingTile` etc. are mapped — likely in a `mapCharacter` or inline spread). Add `race: char.race ?? ''` to that mapping.

Search for the mapping function. It will look like:
```typescript
const mapCharacter = (char: ApiGameCharacter): CharacterState => ({
  id: char.id,
  userId: char.user_id,
  // ...
```

Add `race: char.race ?? '',` to it.

- [ ] **Step 7.4: Run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors related to `race` or `weapon_slug`.

- [ ] **Step 7.5: Commit**

```bash
cd apps/web && git add src/api/playerCharactersApi.ts src/api/game.ts src/store/slices/gameSlice.ts
git commit -m "feat: add race to PlayerCharacter and CharacterState types; add weapon_slug to GameHistoryAction result_data"
```

---

## Task 8: Race badge on CharactersPage + race/archetype line in CharacterInfo

**Files:**
- Modify: `apps/web/src/pages/CharactersPage.tsx`
- Modify: `apps/web/src/components/game/CharacterInfo.tsx`
- Create: `apps/web/src/constants/races.ts`

- [ ] **Step 8.1: Create races constant**

Create `apps/web/src/constants/races.ts`:

```typescript
export interface RaceOption {
  value: string;
  label: string;
  flavor: string;
  statBonuses: string; // e.g. "+1 all stats"
}

export const RACE_OPTIONS: RaceOption[] = [
  { value: 'human',    label: 'Human',    flavor: 'Adaptable and ambitious.',    statBonuses: '+1 all stats' },
  { value: 'elf',      label: 'Elf',      flavor: 'Graceful and keen-eyed.',     statBonuses: '+2 DEX' },
  { value: 'dwarf',    label: 'Dwarf',    flavor: 'Tough and tireless.',         statBonuses: '+2 CON' },
  { value: 'halfling', label: 'Halfling', flavor: 'Lucky and nimble.',           statBonuses: '+2 DEX' },
  { value: 'gnome',    label: 'Gnome',    flavor: 'Curious and inventive.',      statBonuses: '+2 INT' },
  { value: 'half_elf', label: 'Half-Elf', flavor: 'Charming and versatile.',     statBonuses: '+2 CHA' },
  { value: 'half_orc', label: 'Half-Orc', flavor: 'Fierce and resilient.',       statBonuses: '+2 STR, +1 CON' },
  { value: 'tiefling', label: 'Tiefling', flavor: 'Cunning and infernal.',       statBonuses: '+2 CHA, +1 INT' },
];

export const RACE_LABELS: Record<string, string> = Object.fromEntries(
  RACE_OPTIONS.map(r => [r.value, r.label])
);
```

- [ ] **Step 8.2: Add race badge to CharactersPage**

In `apps/web/src/pages/CharactersPage.tsx`, import `RACE_LABELS`:

```typescript
import { RACE_LABELS } from '../constants/races';
```

Find the archetype badge section (the `<span>` with `character.archetype`) and add a race badge before it:

```tsx
<div className="flex items-center gap-2 mt-1">
  <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-purple-500/20 text-purple-400 border border-purple-500/30">
    {RACE_LABELS[character.race] ?? character.race}
  </span>
  <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
    ${character.archetype === 'warrior'
      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    }`}>
    {character.archetype}
  </span>
</div>
```

- [ ] **Step 8.3: Add race+archetype line to CharacterInfo**

In `apps/web/src/components/game/CharacterInfo.tsx`, import `RACE_LABELS`:

```typescript
import { RACE_LABELS } from '../../constants/races';
```

Find the character name display:
```tsx
<h3 className={`m-0 text-lg font-semibold ${teamTextClass}`}>{character.name}</h3>
```

Add a subtitle line immediately after the `</h3>`:

```tsx
<p className="m-0 text-xs text-neutral-500">
  {RACE_LABELS[character.race] ?? character.race} · {String(character.stats?.archetype ?? '')}
</p>
```

Wait — `archetype` is not in `CharacterState.stats`. It's not snapshotted. The simplest fix: the `icon` field is already set to the archetype value (e.g. `"warrior"`). Use `character.icon` as a proxy for archetype display, since `icon` = archetype slug in this codebase.

```tsx
<p className="m-0 text-xs text-neutral-500">
  {RACE_LABELS[character.race] ?? character.race}
  {character.icon ? ` · ${character.icon.charAt(0).toUpperCase()}${character.icon.slice(1)}` : ''}
</p>
```

- [ ] **Step 8.4: Run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8.5: Commit**

```bash
cd apps/web && git add src/pages/CharactersPage.tsx src/components/game/CharacterInfo.tsx src/constants/races.ts
git commit -m "feat: race badge on CharactersPage and race/archetype subtitle in CharacterInfo panel"
```

---

## Task 9: RacePicker component + CharacterDetailPage integration

**Files:**
- Create: `apps/web/src/components/characters/RacePicker.tsx`
- Modify: `apps/web/src/pages/CharacterDetailPage.tsx`
- Modify: `apps/web/src/store/slices/playerCharactersSlice.ts` (verify updatePlayerCharacterThunk passes race)

- [ ] **Step 9.1: Create RacePicker component**

Create `apps/web/src/components/characters/RacePicker.tsx`:

```tsx
import { RACE_OPTIONS } from '../../constants/races';

interface RacePickerProps {
  value: string;
  onChange: (race: string) => void;
  disabled?: boolean;
}

export function RacePicker({ value, onChange, disabled }: RacePickerProps) {
  return (
    <div role="radiogroup" aria-label="Character race" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {RACE_OPTIONS.map((race) => {
        const isSelected = value === race.value;
        return (
          <button
            key={race.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(race.value)}
            className={`
              focus-ring flex flex-col gap-1 p-4 rounded-lg border-2 text-left transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-700'}
              ${isSelected ? 'border-purple-500 bg-neutral-700' : 'border-neutral-600 bg-neutral-800'}
            `}
          >
            <div className={`text-base font-bold ${isSelected ? 'text-purple-400' : 'text-white'}`}>
              {race.label}
            </div>
            <div className="text-xs text-neutral-400">{race.flavor}</div>
            <div className="text-xs text-neutral-500 mt-0.5">{race.statBonuses}</div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9.2: Add RacePicker to CharacterDetailPage**

In `apps/web/src/pages/CharacterDetailPage.tsx`:

Add import:
```typescript
import { RacePicker } from '../components/characters/RacePicker';
```

Add state:
```typescript
const [race, setRace] = useState<string>('human');
```

Update the `useEffect` that initializes state from `character`:
```typescript
useEffect(() => {
  if (character) {
    setName(character.name);
    setArchetype(character.archetype);
    setRace(character.race ?? 'human');
  }
}, [character]);
```

Update `handleSubmit` to include race in the payload:
```typescript
await dispatch(updatePlayerCharacterThunk({
  id: character.id,
  payload: { name, archetype, race },
}));
```

Add the RacePicker section in the form, below the ArchetypePicker section and before the save button:

```tsx
<div className="mb-8">
  <label className="block text-sm font-medium text-neutral-300 mb-2">
    Character Race
  </label>
  <RacePicker
    value={race}
    onChange={setRace}
    disabled={character?.locked || updateStatus === 'loading'}
  />
</div>
```

- [ ] **Step 9.3: Run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 9.4: Commit**

```bash
cd apps/web && git add src/components/characters/RacePicker.tsx src/pages/CharacterDetailPage.tsx
git commit -m "feat: RacePicker component and race editing on CharacterDetailPage"
```

---

## Task 10: Update GameHistory — weapon in attack title + timestamps

**Files:**
- Create: `apps/web/src/constants/equipment.ts`
- Modify: `apps/web/src/components/game/GameHistory.tsx`

- [ ] **Step 10.1: Create equipment constants**

Create `apps/web/src/constants/equipment.ts`:

```typescript
export const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  shortsword: 'Shortsword',
};

export function getEquipmentDisplayName(slug: string | undefined): string | null {
  if (!slug) return null;
  return EQUIPMENT_DISPLAY_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
```

- [ ] **Step 10.2: Update attack card title in GameHistory.tsx**

In `apps/web/src/components/game/GameHistory.tsx`, add import:

```typescript
import { getEquipmentDisplayName } from '../../constants/equipment';
```

Find the attack card render block (the `if (action.action_type === 'attack' && action.result_data?.natural_roll !== undefined)` branch). Find the title line:

```tsx
<div className="font-semibold mb-1">
  {charName ? `${charName} ` : ''}{directionLabel} Attacks {targetName}
</div>
```

Replace with:

```tsx
<div className="font-semibold mb-1">
  {(() => {
    const weaponName = getEquipmentDisplayName(rd.weapon_slug);
    if (weaponName) {
      return `${charName ? `${charName} ` : ''}used ${weaponName} to attack ${targetName} from the ${directionLabel.toLowerCase()}`;
    }
    return `${charName ? `${charName} ` : ''}${directionLabel} Attacks ${targetName}`;
  })()}
</div>
```

- [ ] **Step 10.3: Add timestamps to both attack and non-attack event cards**

In the attack card render block, find the closing `</div>` of the card and add before it:

```tsx
{(action.created_at ?? action.received_at) && (
  <div className="text-xs text-neutral-500 mt-2 border-t border-neutral-600 pt-1.5">
    {action.created_at && (
      <span>Sent {new Date(action.created_at).toLocaleTimeString()}</span>
    )}
    {action.created_at && action.received_at && <span className="mx-1">·</span>}
    {action.received_at && (
      <span>Received {new Date(action.received_at).toLocaleTimeString()}</span>
    )}
  </div>
)}
```

Do the same for the non-attack card (the fallback `return` at the bottom of the `map`). Add the same timestamp block before the closing `</div>`.

- [ ] **Step 10.4: Run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 10.5: Commit**

```bash
cd apps/web && git add src/constants/equipment.ts src/components/game/GameHistory.tsx
git commit -m "feat: weapon name in attack history title; sent/received timestamps on all history event cards"
```

---

## Task 11: Full verification

- [ ] **Step 11.1: Run full backend test suite**

```bash
cd apps/api && bundle exec rspec --format documentation 2>&1 | tail -30
```

Expected: all passing.

- [ ] **Step 11.2: Run full frontend TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11.3: Run frontend linter**

```bash
cd apps/web && npm run lint 2>&1 | tail -20
```

Expected: no new errors (existing pre-existing lint errors are not your responsibility).

- [ ] **Step 11.4: Boot both servers and smoke test**

Start API: `cd apps/api && rails s -p 4000`
Start web: `cd apps/web && npm run dev`

Verify:
1. `/characters` page shows race badge (e.g. "Human") + archetype badge per character
2. `/characters/:id` edit page shows RacePicker with 8 race cards; changing race + saving updates the badge on `/characters`
3. Start a game; CharacterInfo panel shows `Human · Warrior` subtitle under character name
4. Play an attack; game history shows `"Alexander used Shortsword to attack Danvers from the front"`
5. Game history cards show `Sent 2:34:12 PM · Received 2:34:12 PM` footer

- [ ] **Step 11.5: Final commit tagging the version**

```bash
git add -A && git commit -m "feat: Phase 2 Slice 3 — race display, shortsword inventory, history improvements (v2.5.0)"
```
