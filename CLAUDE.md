# DTO — Architecture Principles for AI Agents

## Data-Driven Dispatch Over Branching Logic

**Never use `if/else` or `case/when` chains that branch on a type/category field.**

Instead, use a data-driven registry (hash/map keyed by the discriminant value) so that adding a new type requires only a new entry — not a change to existing dispatch logic.

### The Pattern

```ruby
# BAD — every new archetype requires touching this logic
def movement_amount(character)
  if character.archetype == "warrior"
    3
  elsif character.archetype == "scout"
    5
  end
end

# GOOD — new archetypes add one entry, dispatch logic never changes
ArchetypeDefinitions::ARCHETYPES = {
  "warrior" => { movement: 3, ... },
  "scout"   => { movement: 5, ... }
}

def movement_amount(character)
  ArchetypeDefinitions::ARCHETYPES[character.archetype][:movement]
end
```

```typescript
// BAD
function handleAction(action) {
  if (action.type === "move") { ... }
  else if (action.type === "attack") { ... }
}

// GOOD
const ACTION_MAP = {
  move:   MoveAction,
  attack: AttackAction,
}

function handleAction(action) {
  ACTION_MAP[action.type].execute(action)
}
```

### Rule of Thumb

If you find yourself writing `character.archetype == "X"` or `action.type === "Y"` inside a conditional, stop. The value should be a key into a registry, not a switch target.

### Where This Already Applies

- `ArchetypeDefinitions` (`apps/api/app/models/concerns/archetype_definitions.rb`) — archetype stats
- `ACTION_MAP` in `GameActionsController` / action validator services — action dispatch

---

## Existing Codebase Notes

- **Backend**: Ruby on Rails API (`apps/api/`), PostgreSQL, RSpec
- **Frontend**: React + TypeScript + Vite (`apps/web/`), TailwindCSS
- **Port**: API runs on 4000 (`rails s -p 4000`), web on 5173
- **Auth**: Devise + JWT (token in `Authorization: Bearer` header)
- **Characters**: Each user has 6 `PlayerCharacter` slots, provisioned on first login via `PlayerCharacter.provision_for(user)`
- **Archetypes**: `warrior`, `scout` — defined in `ArchetypeDefinitions::VALID_ARCHETYPES`

## Backlog Todos (Not Yet Implemented)

- `.env` files for port config so `rails s` works without `-p 4000`
  - `apps/api/.env` → `PORT=4000`
  - `apps/web/.env` → `VITE_API_URL=http://localhost:4000`
  - `apps/web/src/api/client.ts` → replace hardcoded URL with `import.meta.env.VITE_API_URL`
