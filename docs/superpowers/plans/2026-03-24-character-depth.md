# Character Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce two distinct character archetypes (Warrior and Scout) with stat blocks that affect HP and movement, replacing identical 10HP tokens with typed characters. Before adding archetypes, this plan also refactors the action dispatch layer into a Command pattern so that new action types (future: charge, dash, spells) slot in without touching existing code, and fills critical gameplay test gaps identified in a codebase audit.

**Architecture:** Add an `archetype` column to `player_characters`, define archetype stats in a central Ruby module, and apply those stats when `game_characters` are created at game start. On the frontend, replace the `IconPicker` with an `ArchetypePicker` component and surface stats in character cards and the in-game panel.

**Tech Stack:** Rails 8 (Ruby), RSpec, FactoryBot, React 19, TypeScript, Redux Toolkit, Tailwind CSS

---

## File Map

### Backend — New / Modified

| File | Action | Purpose |
|------|--------|---------|
| `app/services/action_validators/base_action.rb` | Create | Base class for Command objects: `validate!`, `build_result`, `apply!` |
| `app/services/action_validators/move_action.rb` | Create | Move command: wraps MoveValidator + build/apply logic extracted from controller |
| `app/services/action_validators/attack_action.rb` | Create | Attack command: wraps AttackValidator (absorbs `validate_combat_budget!`) + build/apply |
| `app/services/action_validators/defend_action.rb` | Create | Defend command: wraps DefendValidator + build/apply |
| `app/services/action_validators/end_turn_action.rb` | Create | EndTurn command: wraps EndTurnValidator + build/apply |
| `app/controllers/game_actions_controller.rb` | Modify | Replace two `case` blocks with ACTION_MAP registry; remove duplicate `validate_combat_budget!` |
| `app/services/action_validators/attack_validator.rb` | Modify | Add `validate_not_already_defended!` (absorb the combat budget check) |
| `app/services/action_validators/end_turn_validator.rb` | Modify | Fix `adjacent_to_opponent?` to check all living opponents |
| `spec/requests/game_actions_spec.rb` | Modify | Add: attack-on-defending-target threshold test, 2+ consecutive dead chars, partial kill no-game-end |
| `spec/factories/game_characters.rb` | Modify | Default `stats` to `{ "movement" => 3 }` |
| `app/models/concerns/archetype_definitions.rb` | Create | Single source of truth for archetype stat blocks |
| `db/migrate/<timestamp>_add_archetype_to_player_characters.rb` | Create | Migration: add `archetype` column, default `"warrior"` |
| `app/models/player_character.rb` | Modify | Add archetype validation + icon-from-archetype callback |
| `app/controllers/player_characters_controller.rb` | Modify | Accept `archetype` param, drop `icon` from permitted params |
| `app/controllers/character_selections_controller.rb` | Modify | Apply archetype stats when building `game_characters` |
| `app/services/action_validators/move_validator.rb` | Modify | Read movement budget from `stats["movement"]` not hardcoded `3` |
| `spec/models/player_character_spec.rb` | Modify | Add archetype validation + icon derivation tests |
| `spec/requests/player_characters_spec.rb` | Modify | Add archetype update + icon derivation tests |
| `spec/requests/character_selections_spec.rb` | Modify | Verify stats applied from archetype at game start |
| `spec/factories/player_characters.rb` | Modify | Add `archetype` to factory |

### Frontend — New / Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/store/slices/gameSlice.test.ts` | Modify | Add: `optimisticDefend` reducer, `rollbackGameState` reducer, `submitActionThunk` rollback path, `turn_changed` actingCharacterId update |
| `src/api/playerCharactersApi.ts` | Modify | Add `archetype` to `PlayerCharacter` type + update payload |
| `src/components/characters/ArchetypePicker.tsx` | Create | Two-card archetype selector (replaces IconPicker) |
| `src/components/characters/ArchetypePicker.test.tsx` | Create | Tests for ArchetypePicker |
| `src/pages/CharactersPage.tsx` | Modify | Add archetype badge + compact stat row to each card |
| `src/pages/CharacterDetailPage.tsx` | Modify | Replace `IconPicker` with `ArchetypePicker` |
| `src/components/game/CharacterInfo.tsx` | Modify | Add STR, DEX, MOV to the in-game character panel |

---

## Task 0A: Command Pattern — Extract Action Objects

**Context:** `GameActionsController` has a clean `VALIDATOR_MAP` registry at the top, but then immediately bypasses it with two `case action_type_param` blocks — one for `build_action_result` and one for `apply_action!`. Every new action type (Scout dash, Warrior shove, D&D spells) requires editing both blocks. This task collapses all three into a single `ACTION_MAP` registry where each action type owns its own validation, result-building, and side-effect logic.

**Files:**
- Create: `apps/api/app/services/action_validators/base_action.rb`
- Create: `apps/api/app/services/action_validators/move_action.rb`
- Create: `apps/api/app/services/action_validators/attack_action.rb`
- Create: `apps/api/app/services/action_validators/defend_action.rb`
- Create: `apps/api/app/services/action_validators/end_turn_action.rb`
- Modify: `apps/api/app/controllers/game_actions_controller.rb`

- [ ] **Step 1: Create `BaseAction`**

```ruby
# apps/api/app/services/action_validators/base_action.rb
module ActionValidators
  class BaseAction
    attr_reader :game, :character, :action_data, :turn_context, :current_user

    def initialize(game:, character:, action_data:, turn_context:, current_user:)
      @game         = game
      @character    = character
      @action_data  = action_data
      @turn_context = turn_context
      @current_user = current_user
    end

    # Subclasses must implement all three
    def validate!   = raise NotImplementedError
    def build_result = raise NotImplementedError
    def apply!      = raise NotImplementedError
  end
end
```

- [ ] **Step 2: Create `MoveAction`**

Extract the move-specific logic from the controller's `build_move_result` and the `"move"` branch of `apply_action!`:

```ruby
# apps/api/app/services/action_validators/move_action.rb
module ActionValidators
  class MoveAction < BaseAction
    def validate!
      MoveValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      from_position = character.position.with_indifferent_access.slice(:x, :y)
      path = action_data.with_indifferent_access.fetch(:path, [])
      to_position = path.last.with_indifferent_access.slice(:x, :y)
      { from_position:, to_position: }
    end

    def apply!(result:)
      to = result[:to_position].with_indifferent_access
      character.update!(position: { x: to[:x], y: to[:y] })
    end
  end
end
```

- [ ] **Step 3: Create `AttackAction`**

Extract `build_attack_result` and `apply_attack!` from the controller. The `validate!` method also absorbs the `validate_combat_budget!` check (see Task 0B):

```ruby
# apps/api/app/services/action_validators/attack_action.rb
module ActionValidators
  class AttackAction < BaseAction
    def validate!
      AttackValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      target = game.game_characters.find(target_id)
      success_rate = CombatCalculator.success_rate(
        character.position.with_indifferent_access,
        character.facing_tile.with_indifferent_access,
        target.position.with_indifferent_access,
        target.facing_tile.with_indifferent_access,
        target.is_defending
      )
      roll = CombatCalculator.roll_attack(success_rate, rand_val: action_data.with_indifferent_access[:rand_val])
      target_hp_remaining = [ target.current_hp - roll[:damage].to_i, 0 ].max
      direction = CombatCalculator.attack_direction(
        character.position.with_indifferent_access,
        target.position.with_indifferent_access,
        target.facing_tile.with_indifferent_access
      )

      {
        hit: roll[:hit],
        critical: roll[:critical],
        damage: roll[:damage],
        roll: roll[:roll],
        threshold: success_rate,
        direction: direction.to_s,
        target_hp_remaining:,
        success_rate:,
        target_id: target.id
      }
    end

    def apply!(result:)
      target = game.game_characters.find(result[:target_id])
      target.update!(current_hp: result[:target_hp_remaining])
      game.update!(status: :completed, winner_id: current_user.id) if target.current_hp <= 0
    end

    private

    def target_id
      action_data.with_indifferent_access[:target_character_id]
    end
  end
end
```

- [ ] **Step 4: Create `DefendAction`**

```ruby
# apps/api/app/services/action_validators/defend_action.rb
module ActionValidators
  class DefendAction < BaseAction
    def validate!
      DefendValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      {}
    end

    def apply!(result:)
      facing = action_data.with_indifferent_access[:facing_tile].to_h.with_indifferent_access
      character.update!(is_defending: true, facing_tile: { x: facing[:x], y: facing[:y] })
      advance_turn!
    end

    private

    def advance_turn!
      next_index = compute_next_turn_index
      next_character = next_index ? game.game_characters.find_by(id: game.turn_order[next_index]) : nil
      next_character&.update!(is_defending: false)
      game.update!(
        current_turn_index: next_index || game.current_turn_index,
        current_turn_user_id: next_character ? next_character.user_id : game.current_turn_user_id
      )
    end

    def compute_next_turn_index
      ComputeNextTurnIndex.call(game)
    end
  end
end
```

- [ ] **Step 5: Create `EndTurnAction`**

```ruby
# apps/api/app/services/action_validators/end_turn_action.rb
module ActionValidators
  class EndTurnAction < BaseAction
    def validate!
      EndTurnValidator.new(game:, character:, action_data:, turn_context:).validate!
    end

    def build_result
      next_index = compute_next_turn_index
      next_character = next_index ? game.game_characters.find_by(id: game.turn_order[next_index]) : nil
      {
        next_character_id: next_character&.id,
        turn_number: game.game_actions.where(action_type: :end_turn).count + 2
      }
    end

    def apply!(result:)
      facing = action_data.with_indifferent_access[:facing_tile].to_h.with_indifferent_access
      next_index = compute_next_turn_index
      next_character = next_index ? game.game_characters.find_by(id: game.turn_order[next_index]) : nil

      character.update!(is_defending: false, facing_tile: { x: facing[:x], y: facing[:y] })
      next_character&.update!(is_defending: false)
      game.update!(
        current_turn_index: next_index || game.current_turn_index,
        current_turn_user_id: next_character ? next_character.user_id : game.current_turn_user_id
      )
    end

    private

    def compute_next_turn_index
      ComputeNextTurnIndex.call(game)
    end
  end
end
```

- [ ] **Step 6: Extract `ComputeNextTurnIndex` as a plain object**

Both `DefendAction` and `EndTurnAction` need the same turn-index logic. Extract it so neither duplicates it:

```ruby
# apps/api/app/services/compute_next_turn_index.rb
class ComputeNextTurnIndex
  def self.call(game)
    new(game).call
  end

  def initialize(game)
    @game = game
  end

  def call
    turn_order = @game.turn_order
    turn_count = turn_order.length
    return nil if turn_count.zero?

    next_index = (@game.current_turn_index + 1) % turn_count
    iterations = 0

    while iterations < turn_count
      character = @game.game_characters.find_by(id: turn_order[next_index])
      break if character && character.alive?

      next_index = (next_index + 1) % turn_count
      iterations += 1
    end

    next_index
  end
end
```

Note: this also fixes the double-while-loop bug from the original `compute_next_turn_index` in the controller — a single loop now handles both dead and missing characters safely.

- [ ] **Step 7: Update the controller**

Replace the controller's `VALIDATOR_MAP`, `build_action_result`, `apply_action!`, and the extracted private helpers with the new `ACTION_MAP` registry:

```ruby
# apps/api/app/controllers/game_actions_controller.rb
class GameActionsController < ApplicationController
  include JwtAuthenticatable

  ACTION_MAP = {
    "move"     => ActionValidators::MoveAction,
    "attack"   => ActionValidators::AttackAction,
    "defend"   => ActionValidators::DefendAction,
    "end_turn" => ActionValidators::EndTurnAction
  }.freeze

  before_action :authenticate_user!

  def create
    action = nil
    game = nil
    game_over = false
    turn_changed = false

    ActiveRecord::Base.transaction do
      game = Game.lock.includes(:game_characters, :game_actions).find(params[:id])
      actor = game.acting_character

      ensure_active_game!(game)
      ensure_player!(game)
      ensure_current_turn!(game)

      action_obj = build_action_object(game:, actor:)
      action_obj.validate!

      turn_number     = game.game_actions.where(action_type: :end_turn).count + 1
      sequence_number = game.game_actions.where(turn_number:).count + 1

      result = action_obj.build_result
      action_obj.apply!(result:)

      game_over    = game.completed?
      turn_changed = %w[end_turn defend].include?(action_type_param)

      action = game.game_actions.create!(
        game_character:  actor,
        action_type:     action_type_param,
        action_data:     action_data_param,
        result_data:     result,
        turn_number:,
        sequence_number:
      )
    end

    Broadcaster.game_action_completed(game.reload, action)
    Broadcaster.turn_changed(game) if turn_changed
    Broadcaster.game_over(game) if game_over

    render json: {
      data: {
        action:     action.as_json,
        game_state: GameStateService.new(game.reload).snapshot
      }
    }, status: :ok
  rescue ActiveRecord::RecordNotFound
    render json: { errors: [ "Game not found" ] }, status: :not_found
  rescue ActionValidators::BaseValidator::ValidationError => e
    render json: { errors: [ e.message ] }, status: :unprocessable_content
  end

  # index and attack_preview actions unchanged — omit here, keep existing code

  private

  def build_action_object(game:, actor:)
    action_class = ACTION_MAP[action_type_param]
    raise ActionValidators::BaseValidator::ValidationError, "Unsupported action_type" unless action_class

    action_class.new(
      game:,
      character:    actor,
      action_data:  action_data_param,
      turn_context: turn_context_for(game, actor),
      current_user:
    )
  end

  def ensure_active_game!(game)
    raise ActionValidators::BaseValidator::ValidationError, "Game is not active" unless game.active?
  end

  def ensure_player!(game)
    raise ActionValidators::BaseValidator::ValidationError, "You are not a player in this game" unless game.game_characters.exists?(user_id: current_user.id)
  end

  def ensure_current_turn!(game)
    actor = game.acting_character
    raise ActionValidators::BaseValidator::ValidationError, "It is not your turn" if actor.nil? || actor.user_id != current_user.id
  end

  def action_type_param
    @action_type_param ||= params[:action_type].to_s
  end

  def action_data_param
    raw = params[:action_data]
    return {} if raw.blank?
    raw.respond_to?(:to_unsafe_h) ? raw.to_unsafe_h : raw
  end

  def turn_context_for(game, character)
    current_turn_number = game.game_actions.where(action_type: :end_turn).count + 1
    actions_in_turn     = game.game_actions.where(turn_number: current_turn_number, game_character_id: character.id)

    {
      current_user_id: current_user.id,
      moves_taken:     actions_in_turn.where(action_type: :move).sum("jsonb_array_length(action_data->'path')"),
      has_attacked:    actions_in_turn.where(action_type: :attack).exists?,
      has_defended:    actions_in_turn.where(action_type: :defend).exists?,
      has_ended_turn:  actions_in_turn.where(action_type: :end_turn).exists?
    }
  end
end
```

- [ ] **Step 8: Run full backend test suite to confirm no regressions**

```bash
cd apps/api && bundle exec rspec --format progress
```

Expected: all existing tests pass. The behaviour is identical — only structure changed.

- [ ] **Step 9: Commit**

```bash
cd apps/api && git add app/services/action_validators/ app/services/compute_next_turn_index.rb app/controllers/game_actions_controller.rb && git commit -m "refactor: extract Command objects for each action type, replace case/when blocks with ACTION_MAP registry"
```

---

## Task 0B: Move `validate_combat_budget!` into `AttackValidator`

**Context:** The controller currently has a `validate_combat_budget!` private method that checks whether the character has already defended before an attack. This is a duplicate guard — `AttackValidator` already checks `has_attacked`, and both fire independently. Moving the defend-before-attack check into `AttackValidator` makes the validator the single source of truth for all attack preconditions. After Task 0A, the controller no longer has `validate_combat_budget!` at all — this task cleans up the validator side.

**Files:**
- Modify: `apps/api/app/services/action_validators/attack_validator.rb`
- Modify: `apps/api/spec/services/action_validators/attack_validator_spec.rb`

- [ ] **Step 1: Write a failing test**

Add to `spec/services/action_validators/attack_validator_spec.rb`:

```ruby
context 'when character has already defended this turn' do
  let(:turn_context) { { current_user_id: challenger.id, has_attacked: false, has_defended: true } }

  it 'raises ValidationError' do
    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, "Character has already defended this turn")
  end
end
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd apps/api && bundle exec rspec spec/services/action_validators/attack_validator_spec.rb --format documentation
```

- [ ] **Step 3: Add `validate_not_already_defended!` to `AttackValidator`**

```ruby
# app/services/action_validators/attack_validator.rb
def validate!
  super
  validate_not_already_attacked!
  validate_not_already_defended!   # ← add this line
  validate_target_exists!
  validate_target_belongs_to_opponent!
  validate_target_alive!
  validate_target_adjacent!
end

private

def validate_not_already_defended!
  raise ValidationError, "Character has already defended this turn" if turn_context[:has_defended]
end
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && bundle exec rspec spec/services/action_validators/attack_validator_spec.rb --format documentation
```

- [ ] **Step 5: Commit**

```bash
cd apps/api && git add app/services/action_validators/attack_validator.rb spec/services/action_validators/attack_validator_spec.rb && git commit -m "fix: move validate_combat_budget! into AttackValidator, single source of truth for attack preconditions"
```

---

## Task 0C: Fix `adjacent_to_opponent?` in `EndTurnValidator`

**Context:** `EndTurnValidator#adjacent_to_opponent?` uses `others.find` which returns the *first* opponent character regardless of whether it is alive. In a 2v2 where one opponent is dead, if the dead character is found first and happens to be adjacent, the validator incorrectly exempts the actor from the mandatory-move requirement. Fix: check all *living* opponents.

**Files:**
- Modify: `apps/api/app/services/action_validators/end_turn_validator.rb`
- Modify: `apps/api/spec/services/action_validators/end_turn_validator_spec.rb`

- [ ] **Step 1: Write a failing test**

Add to `spec/services/action_validators/end_turn_validator_spec.rb`:

```ruby
context 'when the only adjacent opponent is dead' do
  let!(:dead_opponent) do
    create(:game_character, game:, user: game.challenged, position: { x: 7, y: 6 }, current_hp: 0)
  end
  let!(:live_opponent) do
    create(:game_character, game:, user: game.challenged, position: { x: 9, y: 9 }, current_hp: 10)
  end
  let(:action_data) { { facing_tile: { x: 6, y: 7 } } }

  it 'requires movement because no living opponent is adjacent' do
    # actor is at {x:6, y:6}, dead_opponent is adjacent at {x:7, y:6}, live_opponent is far away
    # without the fix, find returns dead_opponent and incorrectly skips the movement requirement
    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, /Must move/)
  end
end
```

Note: look at the existing spec to confirm `actor` position and the `validator` subject setup — mirror the existing `let` pattern.

- [ ] **Step 2: Run to confirm failure**

```bash
cd apps/api && bundle exec rspec spec/services/action_validators/end_turn_validator_spec.rb --format documentation
```

- [ ] **Step 3: Fix `adjacent_to_opponent?`**

```ruby
# app/services/action_validators/end_turn_validator.rb
def adjacent_to_opponent?
  others = other_characters
  return false if others.empty?

  living_opponents = others.select { |c| c.user_id != character.user_id && c.alive? }
  living_opponents.any? { |opponent| adjacent_cardinal?(normalize_position(character.position), normalize_position(opponent.position)) }
end
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && bundle exec rspec spec/services/action_validators/end_turn_validator_spec.rb --format documentation
```

- [ ] **Step 5: Commit**

```bash
cd apps/api && git add app/services/action_validators/end_turn_validator.rb spec/services/action_validators/end_turn_validator_spec.rb && git commit -m "fix: adjacent_to_opponent? checks only living opponents"
```

---

## Task 0D: Gameplay Test Gaps

**Context:** Four high-risk gaps in gameplay test coverage identified in a codebase audit. These need to be green before Phase 1 changes land.

**Files:**
- Modify: `apps/api/spec/requests/game_actions_spec.rb`
- Modify: `apps/web/src/store/slices/gameSlice.test.ts`

### Backend gaps

- [ ] **Step 1: Write — attack against a defending target raises the threshold**

The `CombatCalculator` already implements the +6 threshold for defending targets, but no integration test verifies the full request flow reads `is_defending` and applies it to the `threshold` in `result_data`. Add inside `describe "POST /games/:id/actions"`:

```ruby
it "applies +6 to-hit threshold when target is defending" do
  challenged_character.update!(
    position: { x: 2, y: 3 },
    facing_tile: { x: 2, y: 2 },
    is_defending: true,
    current_hp: 10
  )

  post "/games/#{game.id}/actions",
    params: {
      action_type: :attack,
      action_data: {
        target_character_id: challenged_character.id,
        rand_val: 20
      }
    },
    headers: challenger_headers

  expect(response).to have_http_status(:ok)
  result = json_response.dig("data", "action", "result_data")
  # Front-facing + defending = 11 + 6 = 17
  expect(result["threshold"]).to eq(17)
end
```

- [ ] **Step 2: Write — 2+ consecutive dead characters are skipped in turn order**

Add inside the `"with four characters in turn order"` context block:

```ruby
it "skips two consecutive dead characters when advancing turn" do
  # index 0 = challenger_character (acting), index 1 = challenged_character (dead),
  # index 2 = challenger_character_two (dead), index 3 = challenged_character_two (alive)
  challenged_character.update!(current_hp: 0)
  challenger_character_two.update!(current_hp: 0)

  post "/games/#{game.id}/actions",
    params: { action_type: :move, action_data: { path: [ { x: 2, y: 1 } ] } },
    headers: challenger_headers
  expect(response).to have_http_status(:ok)

  post "/games/#{game.id}/actions",
    params: { action_type: :end_turn, action_data: { facing_tile: { x: 2, y: 2 } } },
    headers: challenger_headers

  expect(response).to have_http_status(:ok)
  game.reload
  # Should have jumped from index 0 over indices 1 and 2 (both dead) to index 3
  expect(game.current_turn_index).to eq(3)
  expect(json_response.dig("data", "action", "result_data", "next_character_id")).to eq(challenged_character_two.id)
end
```

- [ ] **Step 3: Write — killing one opponent does not end the game**

In the 2v2 scenario, each player has two characters. Killing one should not trigger game completion. Add inside `describe "POST /games/:id/actions"` (uses the two-character-per-team setup already defined in the outer `let` block):

```ruby
context "with four characters (2v2)" do
  let!(:challenger_character_two) do
    create(:game_character, game: game, user: challenger, position: { x: 3, y: 2 }, facing_tile: { x: 3, y: 3 }, current_hp: 10)
  end
  let!(:challenged_character_two) do
    create(:game_character, game: game, user: challenged, position: { x: 2, y: 4 }, facing_tile: { x: 2, y: 3 }, current_hp: 10)
  end

  before do
    game.update!(
      turn_order: [ challenger_character.id, challenged_character.id, challenger_character_two.id, challenged_character_two.id ],
      current_turn_index: 0
    )
  end

  it "does not end the game when only one of two opponents is killed" do
    challenged_character.update!(current_hp: 1, position: { x: 2, y: 3 }, facing_tile: { x: 2, y: 2 })

    post "/games/#{game.id}/actions",
      params: {
        action_type: :attack,
        action_data: {
          target_character_id: challenged_character.id,
          rand_val: 20
        }
      },
      headers: challenger_headers

    expect(response).to have_http_status(:ok)
    game.reload
    expect(game.status).to eq("active")
    expect(game.winner_id).to be_nil
    expect(challenged_character.reload.current_hp).to eq(0)
  end
end
```

- [ ] **Step 4: Run backend specs to confirm new tests fail (before fix), then pass after**

The partial-kill test should already pass (the current code sets winner on any death — if it fails that reveals the bug). The defending threshold and double-dead-skip tests should fail until the refactors in 0A–0C land.

```bash
cd apps/api && bundle exec rspec spec/requests/game_actions_spec.rb --format documentation
```

- [ ] **Step 5: Commit backend test additions**

```bash
cd apps/api && git add spec/requests/game_actions_spec.rb && git commit -m "test: add gameplay coverage — defending threshold, consecutive dead skip, partial kill no game-end"
```

### Frontend gaps

- [ ] **Step 6: Add missing reducer and thunk tests to `gameSlice.test.ts`**

Add the following test cases to the existing `gameSlice.test.ts`. Use the existing `setupStore`, `mockGameState`, and `mockApiGame` fixtures already defined in the file:

```typescript
// Inside describe('gameSlice')

it('should handle optimisticDefend reducer', () => {
  const store = setupStore();
  store.dispatch(updateGameState(mockGameState));

  store.dispatch(optimisticDefend({
    characterId: 1,
    facingTile: { x: 1, y: 3 },
  }));

  const character = store.getState().game.gameState?.characters[0];
  expect(character?.isDefending).toBe(true);
  expect(character?.facingTile).toEqual({ x: 1, y: 3 });
});

it('should handle rollbackGameState reducer', () => {
  const store = setupStore();
  const alteredState = {
    ...mockGameState,
    characters: [{ ...mockGameState.characters[0], position: { x: 5, y: 5 } }],
  };
  store.dispatch(updateGameState(alteredState));
  store.dispatch(rollbackGameState(mockGameState));

  expect(store.getState().game.gameState?.characters[0].position).toEqual({ x: 1, y: 1 });
});

it('should handle turn_changed updating actingCharacterId', () => {
  const store = setupStore();
  store.dispatch(updateGameState({ ...mockGameState, actingCharacterId: 1 }));
  store.dispatch(handleGameChannelMessage({
    event: 'turn_changed',
    data: { next_character_id: 2, current_turn_user_id: 2 },
  } as any));

  expect(store.getState().game.gameState?.actingCharacterId).toBe(2);
  expect(store.getState().game.gameState?.currentTurnUserId).toBe(2);
});
```

For `submitActionThunk` rollback, add a test that mocks the API to reject, dispatches the thunk, and asserts the position reverted:

```typescript
it('submitActionThunk rolls back optimistic move on API failure', async () => {
  vi.mocked(gameApi.submitAction).mockRejectedValueOnce(new Error('422'));

  const store = setupStore();
  store.dispatch(updateGameState(mockGameState));

  // Position before optimistic move
  const originalPosition = store.getState().game.gameState?.characters[0].position;

  await store.dispatch(submitActionThunk({
    gameId: 1,
    actionType: 'move',
    actionData: { path: [{ x: 5, y: 5 }] },
  }));

  // After rejection, position should be restored
  expect(store.getState().game.gameState?.characters[0].position).toEqual(originalPosition);
});
```

You will need to add `submitActionThunk`, `optimisticDefend`, and `rollbackGameState` to the import list at the top of the test file, and add `submitAction: vi.fn()` to the `gameApi` mock.

- [ ] **Step 7: Run frontend tests to confirm new tests fail, then pass**

```bash
cd apps/web && npm run test -- gameSlice
```

- [ ] **Step 8: Commit frontend test additions**

```bash
cd apps/web && git add src/store/slices/gameSlice.test.ts && git commit -m "test: add optimisticDefend, rollbackGameState, turn_changed actingCharacterId, and submitActionThunk rollback coverage"
```

---

## Task 1: Archetype Definitions Module (Backend)

**Files:**
- Create: `apps/api/app/models/concerns/archetype_definitions.rb`

- [ ] **Step 1: Create the module**

```ruby
# apps/api/app/models/concerns/archetype_definitions.rb
module ArchetypeDefinitions
  ARCHETYPES = {
    "warrior" => { icon: "warrior", max_hp: 16, movement: 3, str: 14, dex: 8 },
    "scout"   => { icon: "rogue",   max_hp: 10, movement: 5, str: 8,  dex: 14 }
  }.freeze

  VALID_ARCHETYPES = ARCHETYPES.keys.freeze

  def self.stats_for(archetype)
    ARCHETYPES.fetch(archetype)
  end

  def self.icon_for(archetype)
    ARCHETYPES.dig(archetype, :icon)
  end
end
```

- [ ] **Step 2: Verify it loads in the Rails console**

```bash
cd apps/api && rails runner "puts ArchetypeDefinitions::ARCHETYPES.inspect"
```

Expected: `{"warrior"=>{icon: "warrior", max_hp: 16, movement: 3, str: 14, dex: 8}, "scout"=>{icon: "rogue", max_hp: 10, movement: 5, str: 8, dex: 14}}`

---

## Task 2: Database Migration

**Files:**
- Create: `apps/api/db/migrate/<timestamp>_add_archetype_to_player_characters.rb`

- [ ] **Step 1: Generate the migration**

```bash
cd apps/api && rails generate migration AddArchetypeToPlayerCharacters archetype:string
```

- [ ] **Step 2: Edit the migration to add default and null constraint**

```ruby
class AddArchetypeToPlayerCharacters < ActiveRecord::Migration[8.0]
  def change
    add_column :player_characters, :archetype, :string, null: false, default: "warrior"
  end
end
```

- [ ] **Step 3: Run the migration**

```bash
cd apps/api && rails db:migrate
```

Expected: migration runs without error, `schema.rb` now includes `t.string "archetype", default: "warrior", null: false`

- [ ] **Step 4: Verify in console**

```bash
cd apps/api && rails runner "puts PlayerCharacter.first&.archetype"
```

Expected: `warrior`

---

## Task 3: PlayerCharacter Model — Archetype Validation + Icon Derivation

**Files:**
- Modify: `apps/api/app/models/player_character.rb`
- Modify: `apps/api/spec/models/player_character_spec.rb`
- Modify: `apps/api/spec/factories/player_characters.rb`

- [ ] **Step 1: Write failing tests**

The existing spec file has `subject(:player_character) { build(:player_character) }` at the top — that's the `player_character` variable used in the tests below. Add these describe blocks inside the outer `RSpec.describe PlayerCharacter` block:

```ruby
# spec/models/player_character_spec.rb — add these describe blocks

describe 'archetype validations' do
  it { is_expected.to validate_presence_of(:archetype) }

  it 'is valid with warrior archetype' do
    player_character.archetype = 'warrior'
    expect(player_character).to be_valid
  end

  it 'is valid with scout archetype' do
    player_character.archetype = 'scout'
    expect(player_character).to be_valid
  end

  it 'is invalid with an unknown archetype' do
    player_character.archetype = 'mage'
    expect(player_character).not_to be_valid
    expect(player_character.errors[:archetype]).to include("is not included in the list")
  end
end

describe 'icon derivation' do
  it 'sets icon to warrior when archetype is warrior' do
    player_character.archetype = 'warrior'
    player_character.valid?
    expect(player_character.icon).to eq('warrior')
  end

  it 'sets icon to rogue when archetype is scout' do
    player_character.archetype = 'scout'
    player_character.valid?
    expect(player_character.icon).to eq('rogue')
  end
end

describe '.provision_for' do
  it 'creates six characters all with warrior archetype by default' do
    user = create(:user)
    provisioned = described_class.provision_for(user)
    expect(provisioned.map(&:archetype).uniq).to eq(['warrior'])
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && bundle exec rspec spec/models/player_character_spec.rb --format documentation
```

Expected: multiple failures about `archetype` not being defined

- [ ] **Step 3: Update factory**

```ruby
# spec/factories/player_characters.rb
FactoryBot.define do
  factory :player_character do
    association :user
    sequence(:name) { |n| PlayerCharacter::AVAILABLE_NAMES[(n - 1) % PlayerCharacter::AVAILABLE_NAMES.length] }
    archetype { 'warrior' }
    locked { false }
  end
end
```

- [ ] **Step 4: Update the model**

```ruby
# app/models/player_character.rb
class PlayerCharacter < ApplicationRecord
  PROVISION_COUNT = 6
  AVAILABLE_NAMES = %w[
    Xavier Summers Drake McCoy Warren Jean Grey Calvin Lorna Dane Alex Wagner
    Kurt Logan Cassidy Sean Scott James Ororo Yoshida Shiro Piotr Pryde Rogue
    Magnus Braddock Blaire Remy Lee Bishop Guthrie Nathan Dayspring Dani Frost
    Xorn Jono Cain Raven Victor Cred Hisako Megan da\ Costa Namor McKenzie
    Neena Illyana Elizabeth Alison Karima Laura Ramsey Haller Nate Clarice
    Monet Gabby Madrox Everett David Kamala Idie Joanna Sooraya Julian Keller
    Santo Nori Victor Hope Arkady Akihiro Lila Duke Trask Bennet Marko Yuriko
    Jason Nathaniel Shaw Harada Emma Wilson Cortez Shinobi Hank Lang Felicia
    Shuri Romanoff Rogers Danvers Carol Steve Ty Layla Bowen Murdock Matt Sam
    Blaze Clint Barton Tandy Tony Stark Bruce Banner Susan Danny Rand Jones
    Rider Rich Richard Castle Walters Jennifer Marc Peter Pete Parker Drew
    Brock Cho Mac Hudson Chris Powell Brooks Brian Douglas Foley Greg Dwayne
    Taylor Alexander Cage Miles Morales Hobie Ross Barnes Monroe Nico
  ].freeze

  belongs_to :user

  validates :name, presence: true
  validates :archetype, presence: true, inclusion: { in: ArchetypeDefinitions::VALID_ARCHETYPES }

  before_validation :derive_icon_from_archetype

  scope :for_owner, ->(user_or_id) { where(user_id: user_or_id.is_a?(User) ? user_or_id.id : user_or_id) }

  def self.provision_for(user)
    names = AVAILABLE_NAMES.sample(PROVISION_COUNT)

    transaction do
      names.map do |name|
        create!(user: user, name: name, archetype: 'warrior', locked: false)
      end
    end
  end

  private

  def derive_icon_from_archetype
    self.icon = ArchetypeDefinitions.icon_for(archetype) if archetype.present?
  end
end
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api && bundle exec rspec spec/models/player_character_spec.rb --format documentation
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
cd apps/api && git add app/models/concerns/archetype_definitions.rb app/models/player_character.rb spec/models/player_character_spec.rb spec/factories/player_characters.rb db/migrate db/schema.rb && git commit -m "feat: add archetype to PlayerCharacter with icon derivation"
```

---

## Task 4: PlayerCharacters API — Accept Archetype, Expose in Response

**Files:**
- Modify: `apps/api/app/controllers/player_characters_controller.rb`
- Modify: `apps/api/spec/requests/player_characters_spec.rb`

- [ ] **Step 1: Write failing tests**

Add to `spec/requests/player_characters_spec.rb`:

```ruby
describe 'PATCH /player_characters/:id' do
  context 'when updating archetype to scout' do
    it 'updates archetype and derives icon' do
      character = create(:player_character, user: user, archetype: 'warrior')

      patch "/player_characters/#{character.id}",
        params: { archetype: 'scout' },
        headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      json = response.parsed_body
      expect(json.dig('data', 'archetype')).to eq('scout')
      expect(json.dig('data', 'icon')).to eq('rogue')
    end
  end

  context 'when sending an invalid archetype' do
    it 'returns 422' do
      character = create(:player_character, user: user)

      patch "/player_characters/#{character.id}",
        params: { archetype: 'mage' },
        headers: auth_headers(user)

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end

describe 'GET /player_characters' do
  it 'includes archetype in the response' do
    create(:player_character, user: user, archetype: 'scout')

    get '/player_characters', headers: auth_headers(user)

    expect(response).to have_http_status(:ok)
    character = response.parsed_body.dig('data', 0)
    expect(character['archetype']).to eq('scout')
  end
end
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd apps/api && bundle exec rspec spec/requests/player_characters_spec.rb --format documentation
```

- [ ] **Step 3: Update the controller**

```ruby
# app/controllers/player_characters_controller.rb
def player_character_params
  params.permit(:name, :archetype)
end

def serialize_player_character(character)
  character.as_json(only: [ :id, :name, :icon, :locked, :archetype ])
end
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && bundle exec rspec spec/requests/player_characters_spec.rb --format documentation
```

- [ ] **Step 5: Commit**

```bash
cd apps/api && git add app/controllers/player_characters_controller.rb spec/requests/player_characters_spec.rb && git commit -m "feat: expose archetype in player characters API"
```

---

## Task 5: Apply Archetype Stats at Game Start

**Files:**
- Modify: `apps/api/app/controllers/character_selections_controller.rb`
- Modify: `apps/api/spec/requests/character_selections_spec.rb`

- [ ] **Step 1: Write failing tests**

The spec already has top-level `let` vars for `challenger`, `challenged`, `game`, `challenger_characters`, and `challenged_characters` (with a `before` block that materializes them). Add the following `context` block inside the outer `describe "POST /games/:id/select_characters"` block — it reuses those vars and issues both selections before asserting:

```ruby
context 'when both players select characters with different archetypes' do
  it 'creates game_characters with stats from archetype' do
    warrior_pcs = create_list(:player_character, 2, user: challenger, archetype: 'warrior')
    scout_pcs   = create_list(:player_character, 2, user: challenged, archetype: 'scout')

    post "/games/#{game.id}/select_characters",
      params: { player_character_ids: warrior_pcs.map(&:id) },
      headers: auth_headers(challenger)

    post "/games/#{game.id}/select_characters",
      params: { player_character_ids: scout_pcs.map(&:id) },
      headers: auth_headers(challenged)

    expect(response).to have_http_status(:ok)
    game.reload

    warrior_gcs = game.game_characters.where(user: challenger).order(:id)
    scout_gcs   = game.game_characters.where(user: challenged).order(:id)

    warrior_gcs.each do |gc|
      expect(gc.max_hp).to eq(16)
      expect(gc.current_hp).to eq(16)
      expect(gc.stats["movement"]).to eq(3)
      expect(gc.stats["str"]).to eq(14)
      expect(gc.stats["dex"]).to eq(8)
    end

    scout_gcs.each do |gc|
      expect(gc.max_hp).to eq(10)
      expect(gc.current_hp).to eq(10)
      expect(gc.stats["movement"]).to eq(5)
      expect(gc.stats["str"]).to eq(8)
      expect(gc.stats["dex"]).to eq(14)
    end
  end
end
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd apps/api && bundle exec rspec spec/requests/character_selections_spec.rb --format documentation
```

- [ ] **Step 3: Update `character_attributes_for` in the controller**

Replace the existing `character_attributes_for` private method:

```ruby
def character_attributes_for(user, position, player_character:)
  x, y = position[0], position[1]
  facing = y > 1 ? { x: x, y: y - 1 } : { x: x, y: y + 1 }
  archetype_stats = ArchetypeDefinitions.stats_for(player_character.archetype)

  {
    user: user,
    max_hp: archetype_stats[:max_hp],
    current_hp: archetype_stats[:max_hp],
    is_defending: false,
    stats: {
      movement: archetype_stats[:movement],
      str: archetype_stats[:str],
      dex: archetype_stats[:dex]
    },
    position: { x: x, y: y },
    facing_tile: facing,
    icon: player_character.icon,
    name: player_character.name
  }
end
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && bundle exec rspec spec/requests/character_selections_spec.rb --format documentation
```

- [ ] **Step 5: Commit**

```bash
cd apps/api && git add app/controllers/character_selections_controller.rb spec/requests/character_selections_spec.rb && git commit -m "feat: apply archetype stats to game_characters at game start"
```

---

## Task 6: Movement Validator — Read from Stats

**Files:**
- Modify: `apps/api/app/services/action_validators/move_validator.rb`

The `MoveValidator` currently hardcodes `3` in two places. Both must read from `character.stats["movement"]`.

- [ ] **Step 1: Write failing tests**

The existing spec has `actor` at `{x: 6, y: 6}` and the existing passing tests use a hardcoded budget of 3. Add a `context` block that sets `movement: 5` on the actor via `update!` and tests paths up to 5 steps:

```ruby
context 'when character is a scout with movement 5' do
  before do
    actor.update!(stats: { "movement" => 5 })
  end

  it 'allows a path of up to 5 steps' do
    five_step_path = { path: [
      { x: 6, y: 7 },
      { x: 6, y: 8 },
      { x: 6, y: 9 },
      { x: 7, y: 9 },
      { x: 7, y: 8 }
    ] }
    validator = described_class.new(game:, character: actor, action_data: five_step_path, turn_context:)
    expect { validator.validate! }.not_to raise_error
  end

  it 'rejects a path of 6 steps' do
    six_step_path = { path: [
      { x: 6, y: 7 },
      { x: 6, y: 8 },
      { x: 6, y: 9 },
      { x: 7, y: 9 },
      { x: 7, y: 8 },
      { x: 7, y: 7 }
    ] }
    validator = described_class.new(game:, character: actor, action_data: six_step_path, turn_context:)
    expect { validator.validate! }
      .to raise_error(ActionValidators::BaseValidator::ValidationError, /Path must contain 1 to 5 steps/)
  end
end
```

**Important — factory update required before running these tests:**

The file `apps/api/spec/factories/game_characters.rb` currently defaults `stats` to `{}`:

```ruby
stats { {} }
```

Change it to:

```ruby
stats { { "movement" => 3 } }
```

This preserves all existing tests (which assume a budget of 3) after `validate_path_shape!` is updated to use `movement_budget`. Without this, the existing `actor`'s `movement_budget` will be `0` and all existing move tests will break.

Also update the existing test at line 42 (`"rejects path longer than 3 squares total"`) — after the change the error message will be dynamic. Update the expected message:

```ruby
# Before:
.to raise_error(ActionValidators::BaseValidator::ValidationError, "Path must contain 1 to 3 steps")
# After:
.to raise_error(ActionValidators::BaseValidator::ValidationError, /Path must contain 1 to 3 steps/)
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd apps/api && bundle exec rspec spec/services/action_validators/move_validator_spec.rb --format documentation
```

- [ ] **Step 3: Update the validator**

```ruby
# app/services/action_validators/move_validator.rb
def validate_path_shape!
  unless path.is_a?(Array) && path.any? && path.length <= movement_budget
    raise ValidationError, "Path must contain 1 to #{movement_budget} steps"
  end
end

def validate_move_budget!
  moves_taken = turn_context[:moves_taken].to_i
  raise ValidationError, "Move budget exceeded for this turn" if moves_taken + path.length > movement_budget
end

def movement_budget
  character.stats["movement"].to_i
end
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && bundle exec rspec spec/services/action_validators/move_validator_spec.rb --format documentation
```

- [ ] **Step 5: Run full backend test suite**

```bash
cd apps/api && bundle exec rspec --format progress
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
cd apps/api && git add app/services/action_validators/move_validator.rb spec/services/action_validators/move_validator_spec.rb && git commit -m "feat: read movement budget from character stats instead of hardcoded 3"
```

---

## Task 7: Frontend — API Types + ArchetypePicker Component

**Files:**
- Modify: `apps/web/src/api/playerCharactersApi.ts`
- Create: `apps/web/src/components/characters/ArchetypePicker.tsx`
- Create: `apps/web/src/components/characters/ArchetypePicker.test.tsx`

- [ ] **Step 1: Update API types**

```typescript
// src/api/playerCharactersApi.ts
export interface PlayerCharacter {
  id: number;
  name: string;
  icon: string;
  archetype: 'warrior' | 'scout';
  locked: boolean;
}

export interface UpdatePlayerCharacterPayload {
  name?: string;
  archetype?: 'warrior' | 'scout';
}
```

- [ ] **Step 2: Write ArchetypePicker tests**

```typescript
// src/components/characters/ArchetypePicker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchetypePicker } from './ArchetypePicker';

describe('ArchetypePicker', () => {
  it('renders both archetype cards', () => {
    render(<ArchetypePicker value="warrior" onChange={() => {}} />);
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    expect(screen.getByText('Scout')).toBeInTheDocument();
  });

  it('marks the current archetype as selected', () => {
    render(<ArchetypePicker value="scout" onChange={() => {}} />);
    const scoutCard = screen.getByRole('radio', { name: /scout/i });
    expect(scoutCard).toHaveAttribute('aria-checked', 'true');
    const warriorCard = screen.getByRole('radio', { name: /warrior/i });
    expect(warriorCard).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked archetype', () => {
    const onChange = vi.fn();
    render(<ArchetypePicker value="warrior" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /scout/i }));
    expect(onChange).toHaveBeenCalledWith('scout');
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<ArchetypePicker value="warrior" onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('radio', { name: /scout/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to confirm failures**

```bash
cd apps/web && npm run test -- ArchetypePicker
```

- [ ] **Step 4: Create ArchetypePicker component**

```typescript
// src/components/characters/ArchetypePicker.tsx
type Archetype = 'warrior' | 'scout';

interface ArchetypeOption {
  value: Archetype;
  label: string;
  flavor: string;
  hp: number;
  mov: number;
  str: number;
  dex: number;
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    value: 'warrior',
    label: 'Warrior',
    flavor: 'Tank. Slow and hard to kill.',
    hp: 16,
    mov: 3,
    str: 14,
    dex: 8,
  },
  {
    value: 'scout',
    label: 'Scout',
    flavor: 'Flanker. Fast and fragile.',
    hp: 10,
    mov: 5,
    str: 8,
    dex: 14,
  },
];

interface ArchetypePickerProps {
  value: Archetype;
  onChange: (archetype: Archetype) => void;
  disabled?: boolean;
}

export function ArchetypePicker({ value, onChange, disabled }: ArchetypePickerProps) {
  return (
    <div role="radiogroup" aria-label="Character archetype" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ARCHETYPES.map((archetype) => {
        const isSelected = value === archetype.value;
        return (
          <button
            key={archetype.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(archetype.value)}
            className={`
              focus-ring flex flex-col gap-3 p-5 rounded-lg border-2 text-left transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-neutral-700'}
              ${isSelected ? 'border-green-500 bg-neutral-700' : 'border-neutral-600 bg-neutral-800'}
            `}
          >
            <div>
              <div className={`text-lg font-bold ${isSelected ? 'text-green-400' : 'text-white'}`}>
                {archetype.label}
              </div>
              <div className="text-sm text-neutral-400 mt-0.5">{archetype.flavor}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-300">
              <span><span className="text-neutral-500">HP</span> {archetype.hp}</span>
              <span><span className="text-neutral-500">MOV</span> {archetype.mov}</span>
              <span><span className="text-neutral-500">STR</span> {archetype.str}</span>
              <span><span className="text-neutral-500">DEX</span> {archetype.dex}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web && npm run test -- ArchetypePicker
```

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/api/playerCharactersApi.ts src/components/characters/ArchetypePicker.tsx src/components/characters/ArchetypePicker.test.tsx && git commit -m "feat: add ArchetypePicker component and update API types"
```

---

## Task 8: Frontend — Characters Page (Archetype Badge + Stat Row)

**Files:**
- Modify: `apps/web/src/pages/CharactersPage.tsx`

- [ ] **Step 1: Update CharactersPage**

Replace the content inside the `characters.map(...)` card with:

```tsx
<div
  key={character.id}
  className="bg-neutral-800 p-6 rounded-lg border border-neutral-700 flex flex-col gap-4 relative overflow-hidden"
>
  <div className="flex justify-between items-start">
    <div>
      <h2 className="text-xl font-bold m-0 text-white">{character.name}</h2>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide
          ${character.archetype === 'warrior'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          }`}>
          {character.archetype}
        </span>
      </div>
      <div className="text-neutral-400 text-sm mt-2 flex gap-3">
        <span>HP {character.archetype === 'warrior' ? 16 : 10}</span>
        <span>MOV {character.archetype === 'warrior' ? 3 : 5}</span>
        <span>STR {character.archetype === 'warrior' ? 14 : 8}</span>
        <span>DEX {character.archetype === 'warrior' ? 8 : 14}</span>
      </div>
    </div>
    {character.locked && (
      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
        In Game
      </span>
    )}
  </div>

  <button
    type="button"
    onClick={() => navigate(`/characters/${character.id}`)}
    className="focus-ring mt-2 bg-blue-600 hover:bg-blue-500 text-white border-none py-2 px-4 rounded-md font-bold cursor-pointer transition-colors w-full"
  >
    Edit Character
  </button>
</div>
```

Note: the stat values are derived inline from archetype. This is intentional — a `ARCHETYPE_STATS` constant can be extracted if needed but is not required for this step.

- [ ] **Step 2: Verify in browser**

Start the frontend (`npm run dev` in `apps/web`) and visit `/characters`. Each card should show an archetype badge and stat row.

- [ ] **Step 3: Commit**

```bash
cd apps/web && git add src/pages/CharactersPage.tsx && git commit -m "feat: show archetype badge and stat row on Characters page"
```

---

## Task 9: Frontend — Character Detail Page (Replace IconPicker with ArchetypePicker)

**Files:**
- Modify: `apps/web/src/pages/CharacterDetailPage.tsx`

- [ ] **Step 1: Update CharacterDetailPage**

- Remove the `icon` state variable and `IconPicker` import
- Add `archetype` state variable initialized from `character.archetype`
- Replace `<IconPicker ... />` with `<ArchetypePicker ... />`
- Update `handleSubmit` to send `archetype` instead of `icon`

Key diff:

```tsx
// Remove:
import { IconPicker } from '../components/characters/IconPicker';
const [icon, setIcon] = useState('warrior');
// setIcon(character.icon) in useEffect
// payload: { name, icon }
// <IconPicker value={icon} onChange={setIcon} disabled={...} />

// Add:
import { ArchetypePicker } from '../components/characters/ArchetypePicker';
const [archetype, setArchetype] = useState<'warrior' | 'scout'>('warrior');
// setArchetype(character.archetype) in useEffect
// payload: { name, archetype }
// <ArchetypePicker value={archetype} onChange={setArchetype} disabled={...} />

// Update the label:
<label className="block text-sm font-medium text-neutral-300 mb-2">
  Character Archetype
</label>
```

- [ ] **Step 2: Verify in browser**

Visit `/characters/:id`. The icon picker is gone. Two large archetype cards appear. Selecting one and saving should persist the change.

- [ ] **Step 3: Commit**

```bash
cd apps/web && git add src/pages/CharacterDetailPage.tsx && git commit -m "feat: replace IconPicker with ArchetypePicker on Character Detail page"
```

---

## Task 10: Frontend — In-Game CharacterInfo Stats Panel

**Files:**
- Modify: `apps/web/src/components/game/CharacterInfo.tsx`

- [ ] **Step 1: Add stat rows to CharacterInfo**

First, update `CharacterState` in `apps/web/src/store/slices/gameSlice.ts`. The current type on line 16 is:

```typescript
stats: Record<string, unknown>;
```

Change it to (use intersection to avoid the index signature conflict):

```typescript
stats: Record<string, unknown> & { movement?: number; str?: number; dex?: number };
```

Also update `mapApiCharacterToCharacterState` (currently around line 103) to explicitly cast the known numeric fields from the raw API payload:

```typescript
const mapApiCharacterToCharacterState = (character: ApiGameCharacter): CharacterState => ({
  id: character.id,
  userId: character.user_id,
  position: normalizePoint(character.position),
  facingTile: normalizePoint(character.facing_tile),
  currentHp: character.current_hp,
  maxHp: character.max_hp,
  isDefending: character.is_defending,
  icon: character.icon,
  name: character.name ?? '',
  alive: character.alive ?? character.current_hp > 0,
  stats: {
    ...(character.stats ?? {}),
    movement: parseNumber((character.stats ?? {})['movement']),
    str: parseNumber((character.stats ?? {})['str']),
    dex: parseNumber((character.stats ?? {})['dex']),
  },
});
```

Then in `apps/web/src/components/game/CharacterInfo.tsx`, after the HP bar section, add:

```tsx
{character.stats && (
  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm" style={{ color: '#d4d4d4' }}>
    <span><strong>MOV</strong> {character.stats.movement ?? '—'}</span>
    <span><strong>STR</strong> {character.stats.str ?? '—'}</span>
    <span><strong>DEX</strong> {character.stats.dex ?? '—'}</span>
  </div>
)}
```

- [ ] **Step 2: Verify in browser**

Start a game. Click a character. The panel should now show MOV, STR, DEX below the HP bar.

- [ ] **Step 3: Commit**

```bash
cd apps/web && git add src/components/game/CharacterInfo.tsx && git commit -m "feat: show stat block in in-game CharacterInfo panel"
```

---

## Task 11: Full Test Suite Pass

- [ ] **Step 1: Run full backend suite**

```bash
cd apps/api && bundle exec rspec --format progress
```

Expected: all pass

- [ ] **Step 2: Run full frontend suite**

```bash
cd apps/web && npm run test
```

Expected: all pass (or pre-existing failures only — do not fix pre-existing failures)

- [ ] **Step 3: If any test fails due to your changes, fix it before proceeding**

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A && git commit -m "chore: phase 1 character depth — cleanup and test fixes"
```
