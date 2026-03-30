# DTO Project Handoff — 2026-03-29

**Project:** DTO (DnD Tactics)
**Stack:** Rails 8 API (port 4000) · React 19 + Vite + TypeScript (port 5173/4001) · PostgreSQL · Action Cable (WebSocket) · Redux Toolkit · Tailwind CSS

---

## What This Game Is

A Final Fantasy Tactics-inspired turn-based tactics game. Two players fight on a grid board using persistent named characters. The long-term vision: D&D 5e-style deep mechanics, FFT sprites, isometric 3D boards, AI opponents that adapt to player tactics via mined game logs.

---

## Where We Are: Phase Roadmap

| Phase | Topic | Status |
|---|---|---|
| **Phase 0** | Stabilization + Command pattern refactor | ✅ Done |
| **Phase 1** | Character Depth (Warrior & Scout archetypes, stat blocks) | ✅ Done |
| **Phase 2 Slice 1** | Multi-character (2v2), 12x12 board, initiative system, tile-based board schema, persistent character system, Tailwind restyle | ✅ Done |
| **Phase 2 Slice 2** | Races, melee range enforcement, D&D 5e attack rolls (attack_stat, AC, damage_die, proficiency_bonus), attack UX overhaul | ✅ Done |
| **Phase 2 Slice 3** | Race display (frontend), shortsword equipment system, history card timestamps | ✅ Done |
| **Phase 3** | Full D&D 5e rules (ability scores, saving throws, spells, action economy) | Not started |
| **Phase 4** | Visual overhaul (FFT sprites, isometric 3D) | Not started |
| **Phase 5** | Scale + Social (tournaments, spectator, leaderboards, AI opponents) | Not started |

Current version: **v2.5.0** (post Phase 2 Slice 3)

---

## What Was Just Completed (Phase 2 Slice 3)

Commits: `1814d6a` → `7cecbd1`

Key things added in Phase 2 Slice 3:
- **Race display (frontend)** — Race is now visible everywhere: roster badges on `CharactersPage`, race/archetype subtitle in `CharacterInfo` (in-game panel), `RacePicker` component on `CharacterDetailPage`. `race` field exposed in all API serializers and snapshotted into `game_character.stats` at game-start.
- **Shortsword equipment system** — `EquipmentDefinitions::ITEMS` populated with shortsword. New `player_character_items` join table tracks inventory/equipped state. All characters (new + existing) provisioned with an equipped shortsword. `CombatCalculator` now reads `damage_die` from the equipped weapon via `EquipmentDefinitions`. `weapon_slug` snapshotted into game character stats at game-start.
- **Weapon name in attack history** — Attack history card title now reads "Alexander used Shortsword to attack Danvers from the front" instead of "Alexander front Attacks Danvers". Frontend `EQUIPMENT_DISPLAY_NAMES` constant maps slugs to display names.
- **History card timestamps** — Sent/received timestamps now rendered in the footer of every game history event card (`text-xs text-neutral-500`).

---

## What Was Completed Before That (Phase 2 Slice 2)

Commit: `0662619 feat: Phase 2 Slice 2 — races, melee range enforcement, attack UX overhaul (v2.4.0)`

Key things added in Phase 2 Slice 2:
- **Races** added to `ArchetypeDefinitions` — characters now have race data affecting stats
- **Melee range enforcement** — attacks now require characters to be in melee range (validated server-side)
- **D&D 5e attack math** — `CombatCalculator` rewritten: `attack_stat`, `AC`, `damage_die`, `proficiency_bonus` wired into attack rolls and `attack_preview`
- **Attack UX overhaul** — frontend updated to reflect new D&D math, roll breakdown display in game history with modifier tooltip

---

## Architecture Principles (from CLAUDE.md)

**Data-driven dispatch over branching logic.** Never use `if/else` or `case/when` chains on type fields. Use registry maps.

Key registries:
- `ArchetypeDefinitions::ARCHETYPES` — single source of truth for archetype + race stat blocks (`apps/api/app/models/concerns/archetype_definitions.rb`)
- `EquipmentDefinitions::ITEMS` — weapon/item definitions keyed by slug (`apps/api/app/models/concerns/equipment_definitions.rb`)
- `ACTION_MAP` in `GameActionsController` — dispatches action objects by type (`move`, `attack`, `defend`, `end_turn`)

---

## Current Codebase Structure

### Backend (`apps/api/`)
- `app/models/player_character.rb` — persistent roster per user (6 chars), `archetype` + `race` columns
- `app/models/player_character_item.rb` — join table: tracks items (equipped/unequipped) per character
- `app/models/concerns/archetype_definitions.rb` — `ARCHETYPES` hash: warrior/scout stats, HP, movement, STR/DEX, attack_stat, AC, damage_die, proficiency_bonus
- `app/models/concerns/equipment_definitions.rb` — `ITEMS` hash: shortsword (damage_die, range, stat_used, proficiency)
- `app/controllers/game_actions_controller.rb` — `ACTION_MAP` registry → Command objects
- `app/services/action_validators/` — `BaseAction`, `MoveAction`, `AttackAction`, `DefendAction`, `EndTurnAction`
- `app/services/combat_calculator.rb` — D&D 5e attack rolls; reads `damage_die` from equipped weapon via `EquipmentDefinitions`
- `CharacterSelectionsController` — snapshots `race` and `weapon_slug` into `game_character.stats` at game-start

### Frontend (`apps/web/`)
- `src/components/characters/ArchetypePicker.tsx` — two-card archetype selector
- `src/components/characters/RacePicker.tsx` — eight-card race selector (new in Slice 3)
- `src/constants/equipment.ts` — `EQUIPMENT_DISPLAY_NAMES` map (slug → display name)
- `src/store/slices/gameSlice.ts` — Redux state, `CharacterState` includes `stats: { movement, str, dex }` + `race` + `weapon_slug`
- `src/components/game/CharacterInfo.tsx` — in-game panel with race/archetype subtitle + MOV/STR/DEX stats
- `src/pages/CharactersPage.tsx` — roster list with race + archetype badges
- `src/pages/CharacterDetailPage.tsx` — edit name, archetype, and race

### Admin System
- `role` integer enum on `users` table (`player: 0`, `admin: 1`)
- `authorize_admin!` guard in `JwtAuthenticatable`
- `Admin::` namespace controllers (characters, users, friendships)
- Frontend: `AdminRoute` component + `role` in authSlice
- Seeded: `nhogan411@gmail.com` = admin
- **No admin frontend UI pages yet** — backend API exists, no screens built

---

## Open Bugs (from BACKLOG.md)

| # | Bug | Status |
|---|-----|--------|
| 1 | Character icons (in-game) too small — should overflow the teardrop shape | Open |
| 2 | Players have to reload the game page to receive WebSocket updates about game state | Open |
| 3 | Action menu state not reset between turns — actions unavailable when turn returns | Open |
| 4 | Game ended after only one character died (should require ALL opponents eliminated) | Likely fixed (`9e4b648`) — needs verification |
| 5 | Set character movement to 5 (currently 3?) | Open |
| 6 | Add sent/received timestamps to game history events | ✅ Fixed in Phase 2 Slice 3 |
| 7 | Character icon not shown from creation — predates archetype system | Likely resolved by archetype/race work — needs verification |

---

## Draft Notes (`.sisyphus/drafts/`)

These were working notes from earlier brainstorming sessions, now mostly superseded:

| File | Topic | Status |
|---|---|---|
| `phase-2.md` | Multi-character & board expansion design | ✅ Implemented |
| `phase-2.1.md` | 2x2 start zones + tile-based board schema | ✅ Implemented |
| `admin-roles.md` | Admin RBAC design | ✅ Implemented |
| `user-roles-admin.md` | Admin role system (refined version) | ✅ Implemented |

---

## What's Next (to discuss)

The roadmap puts **Phase 3: Full D&D 5e Rules Engine** next. The original description:

> Swap the placeholder stat/combat system for D&D 5e mechanics: Races, classes, ability scores, proficiencies, combat using attack rolls, AC, saving throws, spells, abilities, action economy.

Phase 2 Slices 2–3 already entered this territory (D&D attack rolls, AC, proficiency bonus, races, equipment). The question is what slice of Phase 3 to tackle next, and whether any open bugs should be addressed first.

**Candidate topics for the next conversation:**
1. Triage open bugs — verify bugs #4 and #7 are actually fixed; address #1, #2, #3, #5 if still real
2. Scope the next Phase 3 slice: ability scores? saving throws? spell system? classes?
3. Admin UI pages (backend exists, no frontend screens built yet)
4. Account/UX backlog: password reset, profile editing, game invite expiration, post-game history

---

## How to Re-Enter This Context

Start a new session and say:

> "Read `docs/superpowers/specs/2026-03-29-project-handoff.md` and let's talk about what's next."

That file is this document. It is the persistent artifact. Use it instead of a session ID.
