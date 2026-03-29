# Phase 1: Character Depth — Design Spec

**Date:** 2026-03-24
**Project:** DTO (DnD Tactics)
**Phase:** 1 of 5
**Status:** Ready for planning

---

## Overview

Introduce two distinct character archetypes — **Warrior** and **Scout** — that make gameplay feel meaningfully different. Characters move from identical 10HP tokens to typed entities with stat blocks that will serve as the foundation for D&D 5e integration in Phase 2.

This phase is deliberately narrow: no D&D rules, no mechanical use of STR/DEX yet, no more than 2 archetypes. The goal is identity and variety, not complexity.

---

## Context

### Current State

- `player_characters` table: `name`, `icon`, `locked`. No stats.
- `game_characters` table: `current_hp` (hardcoded 10), `max_hp` (hardcoded 10), `stats` (empty jsonb), `icon`, `name`, `is_defending`, `position`, `facing_tile`.
- Movement is hardcoded to 3 tiles per turn for all characters.
- 6 characters are auto-provisioned per user on account creation with random names.
- Character editing: name (editable) + icon (editable via `IconPicker` with 6 options).
- No character creation flow — roster is fixed at 6.

### What Stays the Same

- Auto-provisioning on signup (6 characters per user, random names)
- The 6-character roster size
- Auto-assigned random names
- Character locking during active games

---

## The Two Archetypes

| Attribute | Warrior | Scout |
|-----------|---------|-------|
| `archetype` value | `"warrior"` | `"scout"` |
| Icon | `warrior` | `rogue` |
| Max HP | 16 | 10 |
| Movement (tiles/turn) | 3 | 5 |
| STR | 14 | 8 |
| DEX | 8 | 14 |
| Flavor | Tank. Slow and hard to kill. | Flanker. Fast and fragile. |

STR and DEX are stored as data in Phase 1 but have no mechanical effect until Phase 2 (D&D 5e Rules Engine).

---

## Data Model Changes

### `player_characters` table

Add column: `archetype` (string, not null, default `"warrior"`).

The `icon` field becomes **derived from archetype** rather than independently editable:
- `"warrior"` archetype → `warrior` icon
- `"scout"` archetype → `rogue` icon

The `icon` column is retained on `player_characters` for now but is always set to match the archetype on save. It is not editable independently.

### `game_characters` table

No new columns. The existing `stats` jsonb is populated at game start from the archetype definition:

```json
// Warrior
{ "str": 14, "dex": 8, "movement": 3 }

// Scout
{ "str": 8, "dex": 14, "movement": 5 }
```

`max_hp` is set from the archetype at game start (16 for Warrior, 10 for Scout) instead of defaulting to 10.

`current_hp` is initialized to `max_hp` at game start.

`movement` is read from `stats.movement` wherever movement range is currently hardcoded to 3.

---

## Backend Changes

### Archetype Definition

A Ruby module/constant (e.g. `Archetype::DEFINITIONS`) defines the two archetypes and their stat blocks:

```ruby
DEFINITIONS = {
  "warrior" => { icon: "warrior", max_hp: 16, movement: 3, str: 14, dex: 8 },
  "scout"   => { icon: "rogue",   max_hp: 10, movement: 5, str: 8,  dex: 14 }
}.freeze
```

This is the single source of truth. Game start logic reads from here — no archetype values are hardcoded anywhere else.

### `PlayerCharacter` model

- Add `archetype` validation: must be one of the defined keys (`"warrior"`, `"scout"`).
- `icon` is set automatically from archetype before save (via callback or derived method).
- `PlayerCharacter.provision_for(user)` assigns `archetype: "warrior"` by default for all provisioned characters (users can change later via the edit page).

### Game start logic

When a `GameCharacter` is created at game start:
- Look up the `PlayerCharacter`'s archetype
- Apply `max_hp`, `current_hp`, and `stats` (`str`, `dex`, `movement`) from `Archetype::DEFINITIONS`

### Movement validation

`MoveValidator` (and any other place movement range is hardcoded) reads from `game_character.stats["movement"]` instead of a hardcoded `3`.

### API

`GET /player_characters` response includes `archetype` for each character.

`PATCH /player_characters/:id` accepts `archetype` in the payload. `icon` is not accepted as an independent field — it is derived.

---

## Frontend Changes

### Characters Page (`CharactersPage.tsx`)

Each character card gains:
- An archetype badge: `WARRIOR` or `SCOUT` pill (styled distinctly per archetype — e.g. blue for Warrior, green for Scout)
- A compact stat row: `HP 16 · MOV 3 · STR 14 · DEX 8`

### Character Detail Page (`CharacterDetailPage.tsx`)

The `IconPicker` component is **replaced** with an **Archetype Picker**.

The Archetype Picker renders two large selectable cards side by side. Each card displays:
- Archetype name (large, bold)
- Icon/visual representation
- Stat block: HP, MOV, STR, DEX
- One-line flavor text

Selecting a card sets the archetype. The selected card has a visible active state. The picker is disabled when `character.locked === true`, matching existing behavior for the name field.

The `IconPicker` component can be removed or kept for future use — it is no longer rendered on the Character Detail page.

### In-Game Character Info (`CharacterInfo.tsx`)

The character detail panel shown during a game displays the full stat block: HP (current/max), MOV, STR, DEX.

### Redux / API layer

The `playerCharactersSlice` and related thunks include `archetype` in the character shape. The `updatePlayerCharacterThunk` sends `archetype` (not `icon`) when saving.

---

## What's Explicitly Out of Scope (Phase 1)

- STR and DEX having any mechanical effect on combat or movement
- More than 2 archetypes
- Custom character naming (names remain auto-assigned)
- Equipment, abilities, spells
- Character creation flow (auto-provisioning unchanged)
- Archetype affecting initiative rolls

---

## Success Criteria

- A player can open any character and pick Warrior or Scout
- The selection persists across sessions
- Warriors enter games with 16 HP and 3-tile movement; Scouts enter with 10 HP and 5-tile movement
- STR and DEX are stored in `game_characters.stats` and visible in-game but have no mechanical effect
- Existing games in progress are not broken by the migration (default archetype = Warrior for existing characters)
- All existing tests pass; new behavior is covered by tests
