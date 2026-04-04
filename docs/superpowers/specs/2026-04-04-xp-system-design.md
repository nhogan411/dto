# XP System Design — 2026-04-04

## Overview

Persistent XP and leveling for roster characters. XP is earned from matches and written to `PlayerCharacter` records at game end. Characters level up per the D&D 5e XP threshold table (max level 20). A post-game summary screen shows each team's XP earnings and highlights level-ups.

---

## Data Model

### `player_characters` — new columns

| Column | Type | Default | Notes |
|---|---|---|---|
| `xp` | integer, not null | 0 | Cumulative XP across all matches |
| `level` | integer, not null | 1 | Stored for fast reads; updated atomically with `xp` |

### `game_characters` — new column

| Column | Type | Notes |
|---|---|---|
| `player_character_id` | bigint FK → `player_characters` | Links in-game snapshot to persistent roster slot |

Populated at game-start in `GamesController` when game characters are created.

### `games` — new column

| Column | Type | Default | Notes |
|---|---|---|---|
| `xp_awarded` | boolean, not null | false | Guards against double-awarding XP |

### `game_character.stats` snapshot — new key

`level` must be snapshotted into `game_character.stats` at game-start (alongside existing `race`, `weapon_slug`). Required to reconstruct victim level for XP calculation post-game.

### `ArchetypeDefinitions::ARCHETYPES` — new key per archetype

| Key | Warrior | Scout |
|---|---|---|
| `hit_die` | 10 | 8 |

Used to calculate HP gain per level: `floor(hit_die / 2) + 1`.

- Warrior: +6 HP/level
- Scout: +5 HP/level

`PlayerCharacter#max_hp` is recalculated when level increases.

---

## XP Tables (D&D 5e)

### CR → XP (victim level = CR equivalent)

```ruby
XP_BY_LEVEL = {
  1  => 200,   2  => 450,   3  => 700,   4  => 1_100,  5  => 1_800,
  6  => 2_300, 7  => 2_900, 8  => 3_900, 9  => 5_000,  10 => 5_900,
  11 => 7_200, 12 => 8_400, 13 => 10_000, 14 => 11_500, 15 => 13_000,
  16 => 15_000, 17 => 18_000, 18 => 20_000, 19 => 22_000, 20 => 25_000
}.freeze
```

### Level-up XP thresholds (cumulative)

```ruby
XP_THRESHOLDS = {
  1  => 0,       2  => 300,     3  => 900,     4  => 2_700,
  5  => 6_500,   6  => 14_000,  7  => 23_000,  8  => 34_000,
  9  => 48_000,  10 => 64_000,  11 => 85_000,  12 => 100_000,
  13 => 120_000, 14 => 140_000, 15 => 165_000, 16 => 195_000,
  17 => 225_000, 18 => 265_000, 19 => 305_000, 20 => 355_000
}.freeze
```

Level is the highest entry where `player_character.xp >= threshold`. Level cap is 20 — XP continues to accumulate above 355,000 but level does not increase (preserves the option to add levels later).

---

## XP Calculation — `GameCompletionService`

### When it runs

Called from `GameActionsController#create` after the existing `Broadcaster.game_over(game)` call, when `game_over == true`. Also called from `GamesController#forfeit` after `Broadcaster.game_over`. Runs outside the game action transaction.

### Algorithm

**Step 1 — Reconstruct kills in sequence order**

Query `game.game_actions.where(action_type: :attack).order(:turn_number, :sequence_number)`.

A kill is identified by: `result_data["hit"] == true && result_data["target_hp_remaining"] == 0`.

For each kill:
- Killer: `game_action.game_character_id`
- Victim: `result_data["target_id"]`

**Step 2 — Track alive state as kills are processed**

Maintain a set of alive `game_character` ids, initialized to all characters in the game. Remove each victim as kills are processed in sequence order.

**Step 3 — Split XP per kill**

For each kill, at the moment it occurs:
- Look up victim's level from `game_character.stats["level"]`
- XP pool = `XP_BY_LEVEL[victim_level]`
- Alive teammates of the killer (including the killer) = all game_characters on the killer's team who are currently in the alive set
- Each alive teammate earns `xp_pool / alive_teammate_count` (integer division)

**Step 4 — Halve losers' XP**

After processing all kills, identify the losing team: all `game_characters` whose `user_id != game.winner_id`. Halve each losing character's accumulated XP (integer division).

Forfeit is treated identically — the forfeiting team is the loser.

**Step 5 — Write to PlayerCharacter**

For each `game_character` with earned XP > 0:
- Look up `player_character` via `game_character.player_character_id`
- `player_character.xp += earned_xp`
- Recalculate level from `XP_THRESHOLDS`
- Recalculate `max_hp` if level increased: `new_max_hp = base_max_hp_at_level_1 + (new_level - 1) * hp_per_level`
  - `base_max_hp_at_level_1` = existing `max_hp` value from `ArchetypeDefinitions` at level 1 (currently defined per archetype)
  - `hp_per_level` = `floor(archetype_hit_die / 2) + 1`
- Save atomically

**Step 6 — Build xp_awards payload**

Return an array for the WebSocket broadcast:

```json
[
  {
    "game_character_id": 1,
    "player_character_id": 5,
    "character_name": "Alexander",
    "archetype": "warrior",
    "race": "human",
    "team_user_id": 10,
    "xp_earned": 400,
    "xp_total": 600,
    "old_level": 2,
    "new_level": 3,
    "leveled_up": true,
    "old_max_hp": 22,
    "new_max_hp": 28
  }
]
```

Dead characters (0 XP earned) are still included in the payload so both teams are fully represented on the summary screen.

---

## WebSocket Broadcast

`Broadcaster.game_over` is extended to include `xp_awards` in its payload:

```json
{
  "event": "game_over",
  "game_id": 1,
  "winner_id": 10,
  "status": "completed",
  "xp_awards": [ ... ]
}
```

---

## Frontend — Post-Game XP Summary Screen

### Trigger

When the Redux game slice receives the `game_over` WebSocket event, it stores `xp_awards` in state alongside the existing `winner_id`.

### Display

The existing winner banner is replaced by (or followed by) a **post-game summary screen** showing two columns — one per team.

Each character row displays:
- Character name, archetype, race
- XP earned this match (e.g. `+400 XP`)
- New XP total and level (e.g. `Level 3 — 600 / 900 XP`)
- If `leveled_up == true`: a **"⬆ Level up!"** badge that is a link to `/characters/:player_character_id`
- HP change if leveled up (e.g. `Max HP: 22 → 28`)
- Dead characters shown with dimmed styling and `+0 XP`

### Level-up link

Links to the existing `CharacterDetailPage` (`/characters/:id`). For now this page reflects the new level and updated max HP. A full `CharacterLevelUpWizard` (class selection, ability score improvements, etc.) is planned for a future phase.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Forfeit | Forfeiting team treated as loser — XP halved. Kills before forfeit count. |
| `winner_id` is null | `GameCompletionService` skips XP awards, logs error, does not raise. |
| Character at level 20 | XP accumulates, level stays at 20. |
| Victim level not in `game_character.stats` | Fall back to `PlayerCharacter#level` via `player_character_id`. Log a warning. |
| Service called twice on same game | Guard at entry: query whether any `PlayerCharacter` linked to this game's `game_characters` already has `xp` updated after `game.updated_at`. If so, skip. Simplest approach: add a boolean `xp_awarded` column to `games` and check it before running. |

---

## Files Touched

### Backend
- `db/migrate/` — add `xp`, `level` to `player_characters`; add `player_character_id` to `game_characters`; add `xp_awarded` to `games`
- `app/models/player_character.rb` — `xp`, `level`, `max_hp` logic; level calculation helper
- `app/models/game.rb` — add `xp_awarded` boolean
- `app/models/game_character.rb` — `belongs_to :player_character`
- `app/models/concerns/archetype_definitions.rb` — add `hit_die` per archetype
- `app/services/game_completion_service.rb` — new service (XP calculation + awards)
- `app/controllers/game_actions_controller.rb` — call `GameCompletionService` after `game_over`
- `app/controllers/games_controller.rb` — call `GameCompletionService` after forfeit
- `app/services/broadcaster.rb` — extend `game_over` broadcast with `xp_awards`
- `app/controllers/character_selections_controller.rb` — snapshot `level` into `game_character.stats`; populate `player_character_id`

### Frontend
- `src/store/slices/gameSlice.ts` — add `xpAwards` to game-over state
- `src/components/game/GameOverScreen.tsx` — new component (post-game XP summary)
- `src/constants/xp.ts` — `XP_BY_LEVEL`, `XP_THRESHOLDS` constants (mirrored from backend for display)
