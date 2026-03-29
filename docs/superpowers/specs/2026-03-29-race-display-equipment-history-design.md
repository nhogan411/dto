# Design: Race Display, Shortsword Equipment, History Improvements
**Date:** 2026-03-29
**Version:** v2.5.0 (Phase 2 Slice 3)

---

## Overview

Three independent features bundled as a small slice:

1. **Race display** — Expose the `race` field everywhere on the frontend (roster, detail page, in-game panel). Race already affects stats mechanically; it should be visible.
2. **Shortsword equipment** — Populate `EquipmentDefinitions`, provision all characters with a shortsword at game-start, wire it into `CombatCalculator`, and surface the weapon name in game history attack text.
3. **History card improvements** — Add sent/received timestamps to game history event cards.

---

## Feature 1: Race Display

### Problem

Race was added in Phase 2 Slice 2 and is mechanically live (stat bonuses apply at game-start), but it is invisible everywhere on the frontend:
- `serialize_player_character` omits `:race`
- `player_character_params` does not permit `:race`
- `PlayerCharacter` TypeScript type has no `race` field
- No race picker exists in `CharacterDetailPage`
- No race badge on `CharactersPage`
- `CharacterState` (Redux) has no `race`
- `CharacterInfo` (in-game panel) does not show race

### Design

#### Backend

**`PlayerCharactersController#serialize_player_character`**
Add `:race` to the `only:` list so the field is returned in all read endpoints.

```ruby
# Before
only: [:id, :name, :icon, :locked, :archetype]
# After
only: [:id, :name, :icon, :locked, :archetype, :race]
```

**`PlayerCharactersController#player_character_params`**
Permit `:race` so it can be updated.

```ruby
# Before
params.require(:player_character).permit(:name, :archetype)
# After
params.require(:player_character).permit(:name, :archetype, :race)
```

**`Admin::PlayerCharactersController`**
Apply the same serializer fix (add `:race` to `only:`).

**`CharacterSelectionsController#character_attributes_for`**
`GameCharacter` has no foreign key back to `PlayerCharacter` (it copies `name`, `icon`, etc. at creation time). Race follows the same pattern — store it in `stats["race"]` alongside other snapshot data:

```ruby
stats[:race] = player_character.race
```

**`CharacterSelectionsController#serialize_character`**
Add `race` as a top-level field read from `stats`:

```ruby
race: character.stats["race"]
```

This makes `race` available in Redux `CharacterState` for in-game display without requiring an association traversal.

#### Frontend

**`PlayerCharacter` type** (`apps/web/src/api/playerCharactersApi.ts`)
```typescript
// Add to interface
race: string
```

**`UpdatePlayerCharacterPayload`**
```typescript
race?: string
```

**`CharacterState`** (`apps/web/src/store/slices/gameSlice.ts`)
```typescript
race: string
```

**`CharactersPage`** — Add a race badge next to the archetype badge:
```
[Human] [Warrior]   Alexander
```
Display as pill badges: race first, then archetype.

**`CharacterDetailPage`** — Add a `RacePicker` component below the existing `ArchetypePicker`. The `RacePicker` follows the same two-column card grid pattern as `ArchetypePicker` but with 8 race options. Each card shows:
- Race name (e.g. "Half-Orc")
- Key stat bonus (e.g. "+2 STR, +1 CON")
- A brief flavor descriptor (e.g. "Fierce and resilient")

Race data for the picker is sourced from a frontend constant mirroring `RaceDefinitions` (similar to how archetype constants exist on the frontend). This avoids a dedicated API endpoint for race metadata.

**`CharacterInfo`** (in-game panel) — Add a compact race label below the character name:
```
Alexander
Human  ·  Warrior
```
Rendered as small muted text, no icon needed.

---

## Feature 2: Shortsword Equipment

### Problem

`EquipmentDefinitions::ITEMS` is an empty stub. No concept of weapons exists in `CombatCalculator` or game history. All damage dice come from archetype stats, making weapons invisible in the game.

### Approach

**Option B — Inventory join table.** Shortsword is defined in the `EquipmentDefinitions` registry (code-side, like `ArchetypeDefinitions`). Characters have a persistent `player_character_items` join table recording which items they own and which are equipped. At game-start, `CharacterSelectionsController` reads the character's equipped weapon and passes it into `game_character.stats` (JSONB) so it's available throughout the game without additional DB queries. `CombatCalculator` reads the weapon from stats and uses its `damage_die`.

All existing characters are provisioned with a shortsword (equipped) at the time of `PlayerCharacter.provision_for(user)` — and a migration backfills existing characters.

### Design

#### Backend

**`EquipmentDefinitions::ITEMS`** (`apps/api/app/models/concerns/equipment_definitions.rb`)

```ruby
ITEMS = {
  "shortsword" => {
    name: "Shortsword",
    damage_die: 6,       # 1d6
    damage_bonus: 0,
    range: 1,            # melee only
    stat_used: :dex,     # finesse weapon — uses DEX modifier
    proficiency: true
  }
}.freeze

VALID_ITEMS = ITEMS.keys.freeze
```

**New migration: `player_character_items`**

```ruby
create_table :player_character_items do |t|
  t.references :player_character, null: false, foreign_key: true
  t.string :item_slug, null: false
  t.boolean :equipped, default: false, null: false
  t.timestamps
end
add_index :player_character_items, [:player_character_id, :item_slug], unique: true
```

One row per item per character. `equipped: true` means the character has it in their active slot. At most one weapon can be equipped at a time (enforced at the model level via a validation).

**`PlayerCharacterItem` model** (`apps/api/app/models/player_character_item.rb`)

```ruby
class PlayerCharacterItem < ApplicationRecord
  belongs_to :player_character

  validates :item_slug, inclusion: { in: EquipmentDefinitions::VALID_ITEMS }
  validate :only_one_equipped_weapon_per_character, if: :equipped?

  private

  def only_one_equipped_weapon_per_character
    existing = player_character.player_character_items
      .where(equipped: true)
      .where.not(id: id)
    errors.add(:equipped, "already has an equipped weapon") if existing.exists?
  end
end
```

**`PlayerCharacter` model** — add association:

```ruby
has_many :player_character_items, dependent: :destroy
```

**`PlayerCharacter.provision_for`** — provision shortsword for each new character:

```ruby
names.map do |name|
  pc = create!(user: user, name: name, archetype: ..., locked: false)
  pc.player_character_items.create!(item_slug: "shortsword", equipped: true)
  pc
end
```

**Backfill migration** — give all existing characters a shortsword:

```ruby
PlayerCharacter.find_each do |pc|
  unless pc.player_character_items.exists?(item_slug: "shortsword")
    pc.player_character_items.create!(item_slug: "shortsword", equipped: true)
  end
end
```

**`CharacterSelectionsController#character_attributes_for`**
After applying race stat bonuses, read the character's equipped weapon and store it in stats:

```ruby
equipped_weapon = player_character.player_character_items.find_by(equipped: true)
stats[:weapon_slug] = equipped_weapon&.item_slug || nil
```

This persists the weapon slug into `game_character.stats` (JSONB), making it available throughout the game without additional DB queries mid-game.

**`CombatCalculator`**
When `attacker.stats[:weapon_slug]` is present, use the item's `damage_die` from `EquipmentDefinitions` instead of the archetype's `damage_die`:

```ruby
weapon_slug = attacker.stats["weapon_slug"] || attacker.stats[:weapon_slug]
weapon = EquipmentDefinitions::ITEMS[weapon_slug.to_s] if weapon_slug
damage_die = weapon ? weapon[:damage_die] : attacker.damage_die
```

**`AttackAction#build_result`**
Add `weapon_slug` to the result hash:

```ruby
weapon_slug: attacker.stats["weapon_slug"]
```

This flows into `result_data` stored in `game_actions` and broadcast to the frontend.

#### Frontend

**`GameHistoryAction` result_data type** (`apps/web/src/api/game.ts`)
```typescript
weapon_slug?: string
```

**`GameHistory.tsx` — attack card title**
Change from:
```
"Alexander front Attacks Danvers"
```
To:
```
"Alexander used Shortsword to attack Danvers from the front"
```

The weapon display name is looked up from a frontend `EQUIPMENT_DISPLAY_NAMES` constant keyed by slug.

**Frontend equipment constant** (`apps/web/src/constants/equipment.ts` — new file)
```typescript
export const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  shortsword: "Shortsword",
}
```

---

## Feature 3: History Card Timestamps

### Problem

`created_at` (server send time) and `received_at` (client receipt time) are already present on `GameHistoryAction` — they are just not rendered anywhere.

### Design

Zero backend changes needed.

**`GameHistory.tsx`**
In the event card footer area (below the existing content), render:

```
Sent 2:34:12 PM  ·  Received 2:34:13 PM
```

- Use `toLocaleTimeString()` for formatting
- Show "Sent" if `created_at` is available
- Show "Received" if `received_at` is available
- If neither is present, render nothing (graceful fallback)
- Styling: `text-xs text-neutral-500` — subtle, not distracting

---

## Data Flow Summary

```
PlayerCharacter.provision_for(user)
  └─ creates PlayerCharacterItem(item_slug: "shortsword", equipped: true) per character (new)

CharacterSelectionsController#character_attributes_for
  ├─ applies race stat bonuses (existing)
  └─ reads equipped weapon from player_character_items → stats[:weapon_slug] (new)

AttackAction#build_result
  ├─ calls CombatCalculator.roll_attack
  │    └─ reads stats["weapon_slug"] → EquipmentDefinitions → damage_die (new)
  └─ includes weapon_slug in result hash (new)

game_actions.result_data (stored + broadcast)
  └─ weapon_slug: "shortsword"

GameHistory.tsx
  ├─ attack title: "Alexander used Shortsword to attack Danvers from the front" (new)
  └─ footer: "Sent 2:34:12 PM · Received 2:34:13 PM" (new)
```

---

## Out of Scope (Explicitly)

- Inventory UI (no item equipping/unequipping UI in this slice — items are set at provision time only)
- Multiple weapon support (only shortsword; `player_character_items` table supports adding more later)
- Weapon effects other than `damage_die` override (no special abilities)
- Race editing via admin frontend (admin serializer fix is backend-only read for now)
- RacePicker in admin character management

---

## Testing Notes

- `PlayerCharacterItem` model specs: validates item_slug inclusion, one equipped weapon constraint
- `PlayerCharacter.provision_for` specs: verify each character gets a shortsword item row
- `CombatCalculator` specs: verify `damage_die` is sourced from `EquipmentDefinitions` when `weapon_slug` in stats
- `AttackAction` specs: verify `weapon_slug` appears in `build_result` output
- `CharacterSelectionsController` specs: verify `stats["weapon_slug"]` is set from equipped item at game-start
- `PlayerCharactersController` specs: verify `race` appears in serialized response and is updatable via PATCH
- Frontend: no new test files required for this slice (existing patterns cover component changes)
