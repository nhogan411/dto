# Admin Stats & User Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive health/activity/balance stats to the admin dashboard and a per-user drill-down page at `/admin/users/:id`.

**Architecture:** New `Admin::StatsController` returns aggregate stats via `GET /admin/stats`. Existing `Admin::UsersController#index` and `#show` are enriched with per-user game stats (games played, wins, losses, forfeits) using SQL subqueries to avoid N+1. A new frontend page `AdminUserDetailPage` is added at `/admin/users/:id`. `AdminHomePage` gains new stat cards from the stats endpoint. `AdminUsersPage` gains summary columns and links to the detail page.

**Tech Stack:** Rails 8 API (Ruby), RSpec, React 19 + TypeScript + Vite, Vitest, React Testing Library, React Router, TailwindCSS

---

## File Map

**Created:**
- `apps/api/app/controllers/admin/stats_controller.rb` — aggregate stats endpoint
- `apps/api/spec/requests/admin/stats_spec.rb` — request specs
- `apps/web/src/pages/admin/AdminUserDetailPage.tsx` — per-user drill-down page
- `apps/web/src/pages/admin/AdminUserDetailPage.test.tsx` — component tests

**Modified:**
- `apps/api/config/routes.rb` — add `get "stats"` inside admin namespace
- `apps/api/app/controllers/admin/users_controller.rb` — enrich `serialize_user` with game stats; enrich `show` with full character list and game compositions
- `apps/api/spec/requests/admin/users_spec.rb` — add specs for new fields
- `apps/api/app/models/user.rb` — add `has_many :games_as_challenger` and `has_many :games_as_challenged`
- `apps/web/src/api/admin.ts` — add `AdminStats` type, `AdminUserDetail` type, `getAdminStats`, `getAdminUserDetail` functions
- `apps/web/src/pages/admin/AdminHomePage.tsx` — add new stat cards (total games, active games, games last 7 days, forfeit rate, avg games/user, users with 0 games, avg character level, avg level by archetype, most common winning compositions)
- `apps/web/src/pages/admin/AdminHomePage.test.tsx` — update mocks and assertions for new stats
- `apps/web/src/pages/admin/AdminUsersPage.tsx` — add games played / wins / losses / avg level columns; link rows to detail page
- `apps/web/src/pages/admin/AdminUsersPage.test.tsx` (create if missing) — tests for new columns and links
- `apps/web/src/App.tsx` — add `/admin/users/:id` route

---

## Task 1: Add game associations to User model

**Files:**
- Modify: `apps/api/app/models/user.rb`

- [ ] **Step 1: Add associations**

In `apps/api/app/models/user.rb`, after the existing `has_many :player_characters` line, add:

```ruby
has_many :games_as_challenger,
         class_name: "Game",
         foreign_key: :challenger_id,
         inverse_of: :challenger,
         dependent: :nullify
has_many :games_as_challenged,
         class_name: "Game",
         foreign_key: :challenged_id,
         inverse_of: :challenged,
         dependent: :nullify
```

- [ ] **Step 2: Verify no existing tests break**

```bash
cd apps/api && bundle exec rspec spec/models/user_spec.rb --format documentation
```

Expected: all existing user model specs pass.

- [ ] **Step 3: Commit**

```bash
cd apps/api && git add app/models/user.rb
git commit -m "feat: add games_as_challenger and games_as_challenged associations to User"
```

---

## Task 2: Enrich admin users index with per-user game stats (backend)

**Files:**
- Modify: `apps/api/app/controllers/admin/users_controller.rb`
- Modify: `apps/api/spec/requests/admin/users_spec.rb`

The index action must not N+1. Use a SQL subquery to attach `games_count`, `wins`, `losses`, `forfeits` to each user in one query.

- [ ] **Step 1: Write the failing spec**

Open `apps/api/spec/requests/admin/users_spec.rb`. Add inside the existing `describe "GET /admin/users"` block:

```ruby
it "includes game stats for each user" do
  challenger = create(:user)
  challenged = create(:user)
  create(:game, challenger: challenger, challenged: challenged, status: :completed, winner: challenger)
  create(:game, challenger: challenged, challenged: challenger, status: :forfeited, winner: nil)

  get "/admin/users", headers: admin_headers
  data = response.parsed_body["data"]

  challenger_data = data.find { |u| u["id"] == challenger.id }
  expect(challenger_data["games_count"]).to eq(2)
  expect(challenger_data["wins"]).to eq(1)
  expect(challenger_data["losses"]).to eq(0)
  expect(challenger_data["forfeits"]).to eq(1)
end
```

> Note: Check `spec/support/` for existing factory helpers, auth helpers (`admin_headers`), and `:game` factory definition. Match those conventions exactly.

- [ ] **Step 2: Run spec to confirm it fails**

```bash
cd apps/api && bundle exec rspec spec/requests/admin/users_spec.rb --format documentation
```

Expected: the new example fails with `NoMethodError` or key missing.

- [ ] **Step 3: Update users controller index and serialize_user**

Replace the `index` action and `serialize_user` method in `apps/api/app/controllers/admin/users_controller.rb`:

```ruby
def index
  users = User.select(
    "users.*",
    "(SELECT COUNT(*) FROM games WHERE challenger_id = users.id OR challenged_id = users.id) AS games_count",
    "(SELECT COUNT(*) FROM games WHERE winner_id = users.id) AS wins",
    "(SELECT COUNT(*) FROM games WHERE (challenger_id = users.id OR challenged_id = users.id) AND status = #{Game.statuses[:forfeited]}) AS forfeits"
  ).order(created_at: :asc)

  render json: { data: users.map { |user| serialize_user(user) } }
end

# in private section — also update show to call the same method
def serialize_user(user)
  games_count = user.respond_to?(:games_count) ? user.games_count.to_i : Game.where("challenger_id = :id OR challenged_id = :id", id: user.id).count
  wins        = user.respond_to?(:wins)        ? user.wins.to_i        : Game.where(winner_id: user.id).count
  forfeits    = user.respond_to?(:forfeits)    ? user.forfeits.to_i    : Game.where("(challenger_id = :id OR challenged_id = :id) AND status = :status", id: user.id, status: Game.statuses[:forfeited]).count
  losses      = games_count - wins - forfeits

  user.as_json(only: [ :id, :email, :username, :role, :created_at ])
      .merge(
        games_count: games_count,
        wins: wins,
        losses: losses,
        forfeits: forfeits
      )
end
```

- [ ] **Step 4: Run spec to confirm it passes**

```bash
cd apps/api && bundle exec rspec spec/requests/admin/users_spec.rb --format documentation
```

Expected: all examples pass including the new one.

- [ ] **Step 5: Commit**

```bash
cd apps/api && git add app/controllers/admin/users_controller.rb spec/requests/admin/users_spec.rb
git commit -m "feat: enrich admin users index with per-user game stats (games_count, wins, losses, forfeits)"
```

---

## Task 3: Admin users show — full per-user detail (backend)

**Files:**
- Modify: `apps/api/app/controllers/admin/users_controller.rb`
- Modify: `apps/api/spec/requests/admin/users_spec.rb`

The `show` action needs to return everything for the per-user drill-down: base user fields + game stats + character list (with level, xp, archetype, race) + most common winning team compositions.

- [ ] **Step 1: Write the failing spec**

In `apps/api/spec/requests/admin/users_spec.rb`, add a `describe "GET /admin/users/:id"` block:

```ruby
describe "GET /admin/users/:id" do
  it "returns user with characters and game compositions" do
    user = create(:user)
    pc1  = create(:player_character, user: user, archetype: "warrior", level: 3)
    pc2  = create(:player_character, user: user, archetype: "scout",   level: 5)
    other = create(:user)
    create(:game,
      challenger: user,
      challenged: other,
      status: :completed,
      winner: user,
      challenger_picks: [pc1.id, pc2.id],
      challenged_picks: []
    )

    get "/admin/users/#{user.id}", headers: admin_headers
    data = response.parsed_body["data"]

    expect(data["characters"].length).to eq(2)
    expect(data["characters"].first).to include("level", "xp", "archetype", "race")
    expect(data["winning_compositions"]).to be_an(Array)
    expect(data["games_count"]).to eq(1)
  end

  it "returns 404 for unknown user" do
    get "/admin/users/999999", headers: admin_headers
    expect(response).to have_http_status(:not_found)
  end
end
```

- [ ] **Step 2: Run spec to confirm it fails**

```bash
cd apps/api && bundle exec rspec spec/requests/admin/users_spec.rb --format documentation
```

Expected: the new examples fail.

- [ ] **Step 3: Update show action and add serialize_user_detail**

In `apps/api/app/controllers/admin/users_controller.rb`, update the `show` action and add `serialize_user_detail` in the private section:

```ruby
def show
  render json: { data: serialize_user_detail(@user) }
end

# in private section:
def serialize_user_detail(user)
  games = Game.where("challenger_id = :id OR challenged_id = :id", id: user.id)
  games_count = games.count
  wins        = games.where(winner_id: user.id).count
  forfeits    = games.where(status: :forfeited).count
  losses      = games_count - wins - forfeits

  characters = user.player_characters.map do |pc|
    pc.as_json(only: [:id, :name, :archetype, :race, :level, :xp, :max_hp, :icon, :locked])
  end

  winning_compositions = build_winning_compositions(user, games)

  user.as_json(only: [:id, :email, :username, :role, :created_at])
      .merge(
        games_count: games_count,
        wins: wins,
        losses: losses,
        forfeits: forfeits,
        characters: characters,
        winning_compositions: winning_compositions
      )
end

def build_winning_compositions(user, games)
  winning_games = games.where(winner_id: user.id)
    .where.not(challenger_picks: [], challenged_picks: [])

  pc_cache = PlayerCharacter.where(id: winning_games.flat_map { |g|
    g.challenger_id == user.id ? Array(g.challenger_picks) : Array(g.challenged_picks)
  }).index_by(&:id)

  composition_counts = Hash.new(0)

  winning_games.each do |game|
    picks = game.challenger_id == user.id ? Array(game.challenger_picks) : Array(game.challenged_picks)
    archetypes = picks.filter_map { |id| pc_cache[id]&.archetype }.sort
    composition_counts[archetypes] += 1
  end

  composition_counts
    .sort_by { |_, count| -count }
    .first(5)
    .map { |archetypes, count| { archetypes: archetypes, count: count } }
end
```

- [ ] **Step 4: Run spec to confirm it passes**

```bash
cd apps/api && bundle exec rspec spec/requests/admin/users_spec.rb --format documentation
```

Expected: all examples pass.

- [ ] **Step 5: Commit**

```bash
cd apps/api && git add app/controllers/admin/users_controller.rb spec/requests/admin/users_spec.rb
git commit -m "feat: admin users show returns full detail — characters, game record, winning compositions"
```

---

## Task 4: New /admin/stats endpoint (backend)

**Files:**
- Create: `apps/api/app/controllers/admin/stats_controller.rb`
- Create: `apps/api/spec/requests/admin/stats_spec.rb`
- Modify: `apps/api/config/routes.rb`

- [ ] **Step 1: Add route**

In `apps/api/config/routes.rb`, inside `namespace :admin do`, add:

```ruby
get "stats", to: "stats#index"
```

- [ ] **Step 2: Write the failing spec**

Create `apps/api/spec/requests/admin/stats_spec.rb`:

```ruby
require "rails_helper"

RSpec.describe "GET /admin/stats", type: :request do
  include_context "admin authenticated"   # match whatever shared context the other admin specs use

  it "returns aggregate stats" do
    u1 = create(:user)
    u2 = create(:user)
    u3 = create(:user)   # never played
    pc1 = create(:player_character, user: u1, level: 4, archetype: "warrior")
    pc2 = create(:player_character, user: u2, level: 2, archetype: "scout")
    create(:game, challenger: u1, challenged: u2, status: :completed, winner: u1)
    create(:game, challenger: u1, challenged: u2, status: :active)
    create(:game, challenger: u2, challenged: u1, status: :forfeited)
    create(:game, challenger: u1, challenged: u2, status: :completed,
           winner: u1,
           challenger_picks: [pc1.id],
           challenged_picks: [pc2.id],
           created_at: 3.days.ago)

    get "/admin/stats", headers: admin_headers
    expect(response).to have_http_status(:ok)

    data = response.parsed_body["data"]
    expect(data["total_games"]).to eq(4)
    expect(data["active_games"]).to eq(1)
    expect(data["games_last_7_days"]).to eq(4)
    expect(data["forfeit_rate"]).to be_a(Float)
    expect(data["avg_games_per_user"]).to be_a(Float)
    expect(data["users_with_no_games"]).to eq(1)   # u3 never played
    expect(data["avg_character_level"]).to be_a(Float)
    expect(data["avg_level_by_archetype"]).to be_a(Hash)
    expect(data["top_users_by_games"]).to be_an(Array)
    expect(data["top_winning_compositions"]).to be_an(Array)
  end
end
```

> Note: check existing admin spec files for the correct shared context name (e.g., `include_context "admin authenticated"` vs `let(:admin_headers)`). Match exactly.

- [ ] **Step 3: Run spec to confirm it fails**

```bash
cd apps/api && bundle exec rspec spec/requests/admin/stats_spec.rb --format documentation
```

Expected: routing error or `AbstractController::ActionNotFound`.

- [ ] **Step 4: Create the stats controller**

Create `apps/api/app/controllers/admin/stats_controller.rb`:

```ruby
module Admin
  class StatsController < Admin::BaseController
    def index
      user_count  = User.count
      total_games = Game.count

      completed_and_forfeited = Game.where(status: [ :completed, :forfeited ]).count
      forfeited_count         = Game.where(status: :forfeited).count
      forfeit_rate            = completed_and_forfeited > 0 ? (forfeited_count.to_f / completed_and_forfeited).round(4) : 0.0

      avg_games_per_user = user_count > 0 ? (total_games.to_f / user_count).round(2) : 0.0

      users_with_no_games = User.where(
        "NOT EXISTS (SELECT 1 FROM games WHERE challenger_id = users.id OR challenged_id = users.id)"
      ).count

      top_users = User.select(
        "users.id, users.username,
         (SELECT COUNT(*) FROM games WHERE challenger_id = users.id OR challenged_id = users.id) AS games_count"
      ).order("games_count DESC").limit(5).map do |u|
        { id: u.id, username: u.username, games_count: u.games_count.to_i }
      end

      avg_level           = PlayerCharacter.average(:level)&.to_f&.round(2) || 0.0
      avg_level_by_arch   = PlayerCharacter.group(:archetype).average(:level)
                              .transform_values { |v| v.to_f.round(2) }

      top_compositions = build_top_winning_compositions

      render json: {
        data: {
          total_games:             total_games,
          active_games:            Game.where(status: :active).count,
          games_last_7_days:       Game.where("created_at >= ?", 7.days.ago).count,
          forfeit_rate:            forfeit_rate,
          avg_games_per_user:      avg_games_per_user,
          users_with_no_games:     users_with_no_games,
          avg_character_level:     avg_level,
          avg_level_by_archetype:  avg_level_by_arch,
          top_users_by_games:      top_users,
          top_winning_compositions: top_compositions
        }
      }
    end

    private

    def build_top_winning_compositions
      completed = Game.where(status: :completed).where.not(winner_id: nil)
        .where.not(challenger_picks: [], challenged_picks: [])

      pc_ids = completed.flat_map { |g| Array(g.challenger_picks) + Array(g.challenged_picks) }.uniq
      pc_cache = PlayerCharacter.where(id: pc_ids).index_by(&:id)

      composition_counts = Hash.new(0)

      completed.each do |game|
        winner_picks = game.winner_id == game.challenger_id ? Array(game.challenger_picks) : Array(game.challenged_picks)
        archetypes = winner_picks.filter_map { |id| pc_cache[id]&.archetype }.sort
        composition_counts[archetypes] += 1 unless archetypes.empty?
      end

      composition_counts
        .sort_by { |_, count| -count }
        .first(5)
        .map { |archetypes, count| { archetypes: archetypes, count: count } }
    end
  end
end
```

- [ ] **Step 5: Run spec to confirm it passes**

```bash
cd apps/api && bundle exec rspec spec/requests/admin/stats_spec.rb --format documentation
```

Expected: passes.

- [ ] **Step 6: Run full backend test suite**

```bash
cd apps/api && bundle exec rspec --format progress
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
cd apps/api && git add app/controllers/admin/stats_controller.rb spec/requests/admin/stats_spec.rb config/routes.rb
git commit -m "feat: add /admin/stats endpoint with aggregate health, activity, and balance stats"
```

---

## Task 5: Update frontend API client

**Files:**
- Modify: `apps/web/src/api/admin.ts`

- [ ] **Step 1: Add types and functions**

In `apps/web/src/api/admin.ts`:

1. Update `AdminUser` to include game stats (returned by index):

```typescript
export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  created_at: string;
  games_count: number;
  wins: number;
  losses: number;
  forfeits: number;
}
```

2. Add `AdminPlayerCharacterDetail` (used in user detail):

```typescript
export interface AdminPlayerCharacterDetail {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  locked: boolean;
  archetype: string;
  race: string;
  level: number;
  xp: number;
  max_hp: number;
}
```

3. Add `WinningComposition`:

```typescript
export interface WinningComposition {
  archetypes: string[];
  count: number;
}
```

4. Add `AdminUserDetail` (returned by show):

```typescript
export interface AdminUserDetail extends AdminUser {
  characters: AdminPlayerCharacterDetail[];
  winning_compositions: WinningComposition[];
}
```

5. Add `AdminStats`:

```typescript
export interface AdminStats {
  total_games: number;
  active_games: number;
  games_last_7_days: number;
  forfeit_rate: number;
  avg_games_per_user: number;
  users_with_no_games: number;
  avg_character_level: number;
  avg_level_by_archetype: Record<string, number>;
  top_users_by_games: { id: number; username: string; games_count: number }[];
  top_winning_compositions: WinningComposition[];
}
```

6. Add API functions at the bottom of the file:

```typescript
export const getAdminUserDetail = (id: number) =>
  apiClient.get<{ data: AdminUserDetail }>(`/admin/users/${id}`).then(r => r.data.data);

export const getAdminStats = () =>
  apiClient.get<{ data: AdminStats }>('/admin/stats').then(r => r.data.data);
```

- [ ] **Step 2: Check for LSP errors**

Run LSP diagnostics on `apps/web/src/api/admin.ts`. Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd apps/web && git add src/api/admin.ts
git commit -m "feat: add AdminStats, AdminUserDetail types and getAdminStats, getAdminUserDetail API functions"
```

---

## Task 6: Update AdminHomePage with new stats

**Files:**
- Modify: `apps/web/src/pages/admin/AdminHomePage.tsx`
- Modify: `apps/web/src/pages/admin/AdminHomePage.test.tsx`

- [ ] **Step 1: Update the test first**

Replace `AdminHomePage.test.tsx` with updated mocks and assertions. The page now also calls `getAdminStats`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminHomePage from './AdminHomePage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

const mockStats = {
  total_games: 10,
  active_games: 2,
  games_last_7_days: 4,
  forfeit_rate: 0.1,
  avg_games_per_user: 3.33,
  users_with_no_games: 1,
  avg_character_level: 2.5,
  avg_level_by_archetype: { warrior: 3.0, scout: 2.0 },
  top_users_by_games: [{ id: 1, username: 'alice', games_count: 5 }],
  top_winning_compositions: [{ archetypes: ['warrior', 'scout'], count: 3 }],
};

function renderPage() {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AdminHomePage />
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminHomePage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getAdminUsers).mockResolvedValue([
      { id: 1, email: 'a@a.com', username: 'alice', role: 'admin', created_at: '2026-01-01T00:00:00Z', games_count: 5, wins: 3, losses: 1, forfeits: 1 },
      { id: 2, email: 'b@b.com', username: 'bob',   role: 'player', created_at: '2026-01-02T00:00:00Z', games_count: 2, wins: 1, losses: 1, forfeits: 0 },
    ]);
    vi.mocked(adminApi.getAdminPlayerCharacters).mockResolvedValue([
      { id: 1, user_id: 1, name: 'Hero',  icon: 'warrior', locked: false },
      { id: 2, user_id: 2, name: 'Scout', icon: 'scout',   locked: false },
      { id: 3, user_id: 1, name: 'Tank',  icon: 'warrior', locked: true },
    ]);
    vi.mocked(adminApi.getAdminFriendships).mockResolvedValue([
      { id: 1, requester_id: 1, recipient_id: 2, status: 'accepted', created_at: '2026-01-03T00:00:00Z', requester: { id: 1, username: 'alice' }, recipient: { id: 2, username: 'bob' } },
    ]);
    vi.mocked(adminApi.getAdminStats).mockResolvedValue(mockStats);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders existing stat counts after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total Player Characters')).toBeInTheDocument();
    expect(screen.getByText('Total Friendships')).toBeInTheDocument();
  });

  it('renders game activity stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Total Games')).toBeInTheDocument();
    expect(screen.getByText('Active Games')).toBeInTheDocument();
    expect(screen.getByText('Games (Last 7 Days)')).toBeInTheDocument();
    expect(screen.getByText('Forfeit Rate')).toBeInTheDocument();
  });

  it('renders user management stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Avg Games / User')).toBeInTheDocument();
    expect(screen.getByText('Users With No Games')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('renders balance stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Avg Character Level')).toBeInTheDocument();
    expect(screen.getByText(/warrior/i)).toBeInTheDocument();
    expect(screen.getByText(/scout/i)).toBeInTheDocument();
  });

  it('renders management links', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /player characters/i })).toHaveAttribute('href', '/admin/player-characters');
    expect(screen.getByRole('link', { name: /friendships/i })).toHaveAttribute('href', '/admin/friendships');
  });

  it('shows error message when fetch fails', async () => {
    vi.mocked(adminApi.getAdminUsers).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to confirm new ones fail**

```bash
cd apps/web && npm test -- --run src/pages/admin/AdminHomePage.test.tsx
```

Expected: new stat assertions fail.

- [ ] **Step 3: Update AdminHomePage.tsx**

Replace `apps/web/src/pages/admin/AdminHomePage.tsx` with:

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminUser, AdminPlayerCharacter, AdminFriendship, AdminStats } from '../../api/admin';
import { getAdminUsers, getAdminPlayerCharacters, getAdminFriendships, getAdminStats } from '../../api/admin';

interface DashboardData {
  users: AdminUser[];
  characters: AdminPlayerCharacter[];
  friendships: AdminFriendship[];
  stats: AdminStats;
}

const NAV_LINKS = [
  { label: 'Users',             href: '/admin/users' },
  { label: 'Player Characters', href: '/admin/player-characters' },
  { label: 'Friendships',       href: '/admin/friendships' },
] as const;

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-neutral-600 p-4 min-w-32">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
  );
}

export default function AdminHomePage() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getAdminUsers(),
      getAdminPlayerCharacters(),
      getAdminFriendships(),
      getAdminStats(),
    ])
      .then(([users, characters, friendships, stats]) => {
        setData({ users, characters, friendships, stats });
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-5 bg-[#121212] min-h-screen text-white">Loading dashboard...</div>;
  if (error)   return <div className="p-5 bg-[#121212] min-h-screen text-red-400">Error: {error}</div>;

  const { users, characters, friendships, stats } = data!;

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const OVERVIEW_STATS = [
    { label: 'Total Users',             value: users.length },
    { label: 'Total Player Characters', value: characters.length },
    { label: 'Total Friendships',       value: friendships.length },
  ];

  const ACTIVITY_STATS = [
    { label: 'Total Games',          value: stats.total_games },
    { label: 'Active Games',         value: stats.active_games },
    { label: 'Games (Last 7 Days)',  value: stats.games_last_7_days },
    { label: 'Forfeit Rate',         value: `${(stats.forfeit_rate * 100).toFixed(1)}%` },
  ];

  const USER_STATS = [
    { label: 'Avg Games / User',   value: stats.avg_games_per_user },
    { label: 'Users With No Games', value: stats.users_with_no_games },
  ];

  const BALANCE_STATS = [
    { label: 'Avg Character Level', value: stats.avg_character_level },
  ];

  return (
    <div className="p-5 bg-[#121212] min-h-screen text-white">
      <h1>Admin: Dashboard</h1>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Overview</h2>
      <div className="flex flex-wrap gap-4">
        {OVERVIEW_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Activity</h2>
      <div className="flex flex-wrap gap-4">
        {ACTIVITY_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Users</h2>
      <div className="flex flex-wrap gap-4">
        {USER_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Game Balance</h2>
      <div className="flex flex-wrap gap-4">
        {BALANCE_STATS.map(({ label, value }) => <StatCard key={label} label={label} value={value} />)}
        {Object.entries(stats.avg_level_by_archetype).map(([archetype, avg]) => (
          <StatCard key={archetype} label={`Avg Level — ${archetype}`} value={avg} />
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Top Winning Compositions</h2>
        {stats.top_winning_compositions.length === 0 ? (
          <p className="text-neutral-500 text-sm">No completed games yet.</p>
        ) : (
          <table className="border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-600 text-left">
                <th className="p-2.5">Archetypes</th>
                <th className="p-2.5">Wins</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_winning_compositions.map(({ archetypes, count }) => (
                <tr key={archetypes.join('+')} className="border-b border-neutral-700">
                  <td className="p-2.5">{archetypes.join(' + ')}</td>
                  <td className="p-2.5">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Top Users by Games Played</h2>
        <table className="border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">Username</th>
              <th className="p-2.5">Games</th>
            </tr>
          </thead>
          <tbody>
            {stats.top_users_by_games.map(({ id, username, games_count }) => (
              <tr key={id} className="border-b border-neutral-700">
                <td className="p-2.5">
                  <Link to={`/admin/users/${id}`} className="hover:underline">{username}</Link>
                </td>
                <td className="p-2.5">{games_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Recent Users</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">ID</th>
              <th className="p-2.5">Username</th>
              <th className="p-2.5">Email</th>
              <th className="p-2.5">Role</th>
              <th className="p-2.5">Games</th>
              <th className="p-2.5">W / L / F</th>
              <th className="p-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((user) => (
              <tr key={user.id} className="border-b border-neutral-700">
                <td className="p-2.5">{user.id}</td>
                <td className="p-2.5">
                  <Link to={`/admin/users/${user.id}`} className="hover:underline">{user.username}</Link>
                </td>
                <td className="p-2.5">{user.email}</td>
                <td className="p-2.5">{user.role}</td>
                <td className="p-2.5">{user.games_count}</td>
                <td className="p-2.5">{user.wins} / {user.losses} / {user.forfeits}</td>
                <td className="p-2.5">{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold mb-2 text-neutral-400">Manage</h2>
        <div className="flex gap-4">
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={href} to={href} className="border border-neutral-600 p-4 text-white hover:bg-neutral-800">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test -- --run src/pages/admin/AdminHomePage.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Check LSP**

Run LSP diagnostics on `apps/web/src/pages/admin/AdminHomePage.tsx`. Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/pages/admin/AdminHomePage.tsx src/pages/admin/AdminHomePage.test.tsx
git commit -m "feat: add game activity, user management, and balance stat sections to admin dashboard"
```

---

## Task 7: Update AdminUsersPage with game stats columns and row links

**Files:**
- Modify: `apps/web/src/pages/admin/AdminUsersPage.tsx`
- Create: `apps/web/src/pages/admin/AdminUsersPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/admin/AdminUsersPage.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminUsersPage from './AdminUsersPage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

function renderPage() {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getAdminUsers).mockResolvedValue([
      { id: 1, email: 'a@a.com', username: 'alice', role: 'admin',  created_at: '2026-01-01T00:00:00Z', games_count: 5, wins: 3, losses: 1, forfeits: 1 },
      { id: 2, email: 'b@b.com', username: 'bob',   role: 'player', created_at: '2026-01-02T00:00:00Z', games_count: 2, wins: 1, losses: 1, forfeits: 0 },
    ]);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders user rows with game stats', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('W / L / F')).toBeInTheDocument();
  });

  it('renders links to user detail pages', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    const aliceLink = screen.getByRole('link', { name: 'alice' });
    expect(aliceLink).toHaveAttribute('href', '/admin/users/1');
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(adminApi.getAdminUsers).mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd apps/web && npm test -- --run src/pages/admin/AdminUsersPage.test.tsx
```

Expected: fails (no test file existed / missing columns).

- [ ] **Step 3: Update AdminUsersPage.tsx**

Replace `apps/web/src/pages/admin/AdminUsersPage.tsx` with:

```typescript
import axios from 'axios';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import type { AdminUser } from '../../api/admin';
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '../../api/admin';

export default function AdminUsersPage() {
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers(await getAdminUsers());
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to fetch users' : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      await updateAdminUser(id, { role: newRole });
      await fetchUsers();
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to update user role' : 'Failed to update user role');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteAdminUser(id);
      await fetchUsers();
    } catch (err: unknown) {
      alert(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to delete user' : 'Failed to delete user');
    }
  };

  if (loading) return <div className="p-5 bg-[#121212] min-h-screen text-white">Loading users...</div>;
  if (error)   return <div className="p-5 bg-[#121212] min-h-screen text-red-400">Error: {error}</div>;

  return (
    <div className="p-5 bg-[#121212] min-h-screen text-white">
      <h1>Admin: Users</h1>
      <table className="w-full border-collapse mt-5">
        <thead>
          <tr className="border-b-2 border-neutral-600 text-left">
            <th className="p-2.5">ID</th>
            <th className="p-2.5">Username</th>
            <th className="p-2.5">Email</th>
            <th className="p-2.5">Role</th>
            <th className="p-2.5">Games</th>
            <th className="p-2.5">W / L / F</th>
            <th className="p-2.5">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-neutral-700">
              <td className="p-2.5">{user.id}</td>
              <td className="p-2.5">
                <Link to={`/admin/users/${user.id}`} className="hover:underline">{user.username}</Link>
              </td>
              <td className="p-2.5">{user.email}</td>
              <td className="p-2.5">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  disabled={user.id === currentUserId}
                  className="bg-neutral-800 text-white border border-neutral-600 rounded px-1 py-0.5 disabled:opacity-50"
                >
                  <option value="player">player</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td className="p-2.5">{user.games_count}</td>
              <td className="p-2.5">{user.wins} / {user.losses} / {user.forfeits}</td>
              <td className="p-2.5">
                {user.id !== currentUserId && (
                  <button type="button" onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && npm test -- --run src/pages/admin/AdminUsersPage.test.tsx
```

Expected: all pass.

- [ ] **Step 5: Check LSP**

Run LSP diagnostics on `apps/web/src/pages/admin/AdminUsersPage.tsx`. Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd apps/web && git add src/pages/admin/AdminUsersPage.tsx src/pages/admin/AdminUsersPage.test.tsx
git commit -m "feat: add game stats columns and user detail links to admin users table"
```

---

## Task 8: Create AdminUserDetailPage

**Files:**
- Create: `apps/web/src/pages/admin/AdminUserDetailPage.tsx`
- Create: `apps/web/src/pages/admin/AdminUserDetailPage.test.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add route to App.tsx**

In `apps/web/src/App.tsx`, inside the admin `<Route>` block (alongside the existing admin routes), add:

```tsx
<Route path="users/:id" element={<AdminUserDetailPage />} />
```

Also add the import:
```tsx
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
```

- [ ] **Step 2: Write the failing test**

Create `apps/web/src/pages/admin/AdminUserDetailPage.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdminUserDetailPage from './AdminUserDetailPage';
import * as adminApi from '../../api/admin';
import authReducer from '../../store/slices/authSlice';

vi.mock('../../api/admin');

const mockDetail = {
  id: 1,
  email: 'a@a.com',
  username: 'alice',
  role: 'admin',
  created_at: '2026-01-01T00:00:00Z',
  games_count: 5,
  wins: 3,
  losses: 1,
  forfeits: 1,
  characters: [
    { id: 1, user_id: 1, name: 'Hero', icon: 'warrior', locked: false, archetype: 'warrior', race: 'human', level: 4, xp: 2700, max_hp: 12 },
  ],
  winning_compositions: [
    { archetypes: ['warrior', 'scout'], count: 2 },
  ],
};

function renderPage() {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/admin/users/1']}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getAdminUserDetail).mockResolvedValue(mockDetail);
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders user info after load', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('a@a.com')).toBeInTheDocument();
  });

  it('renders game record', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/wins/i)).toBeInTheDocument();
    expect(screen.getByText(/losses/i)).toBeInTheDocument();
    expect(screen.getByText(/forfeits/i)).toBeInTheDocument();
  });

  it('renders characters table', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('warrior')).toBeInTheDocument();
  });

  it('renders winning compositions', async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/warrior \+ scout/i)).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(adminApi.getAdminUserDetail).mockRejectedValue(new Error('fail'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
cd apps/web && npm test -- --run src/pages/admin/AdminUserDetailPage.test.tsx
```

Expected: fails (file doesn't exist yet).

- [ ] **Step 4: Create AdminUserDetailPage.tsx**

Create `apps/web/src/pages/admin/AdminUserDetailPage.tsx`:

```typescript
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AdminUserDetail } from '../../api/admin';
import { getAdminUserDetail } from '../../api/admin';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser]       = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getAdminUserDetail(Number(id))
      .then(setUser)
      .catch((err: unknown) => {
        setError(axios.isAxiosError(err) ? (err.response?.data?.errors as string[] | undefined)?.[0] ?? 'Failed to load user' : 'Failed to load user');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-5 bg-[#121212] min-h-screen text-white">Loading user...</div>;
  if (error)   return <div className="p-5 bg-[#121212] min-h-screen text-red-400">Error: {error}</div>;
  if (!user)   return null;

  return (
    <div className="p-5 bg-[#121212] min-h-screen text-white">
      <div className="mb-4">
        <Link to="/admin/users" className="text-neutral-400 hover:text-white text-sm">← Back to Users</Link>
      </div>

      <h1 className="text-xl font-bold">{user.username}</h1>
      <p className="text-neutral-400 text-sm mt-1">{user.email} · {user.role} · Joined {new Date(user.created_at).toLocaleDateString()}</p>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Game Record</h2>
      <div className="flex gap-4">
        {[
          { label: 'Total Games', value: user.games_count },
          { label: 'Wins',        value: user.wins },
          { label: 'Losses',      value: user.losses },
          { label: 'Forfeits',    value: user.forfeits },
        ].map(({ label, value }) => (
          <div key={label} className="border border-neutral-600 p-4 min-w-24">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-neutral-400">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Characters</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-600 text-left">
            <th className="p-2.5">Name</th>
            <th className="p-2.5">Archetype</th>
            <th className="p-2.5">Race</th>
            <th className="p-2.5">Level</th>
            <th className="p-2.5">XP</th>
            <th className="p-2.5">Max HP</th>
            <th className="p-2.5">Locked</th>
          </tr>
        </thead>
        <tbody>
          {user.characters.map((pc) => (
            <tr key={pc.id} className="border-b border-neutral-700">
              <td className="p-2.5">{pc.name}</td>
              <td className="p-2.5">{pc.archetype}</td>
              <td className="p-2.5">{pc.race}</td>
              <td className="p-2.5">{pc.level}</td>
              <td className="p-2.5">{pc.xp}</td>
              <td className="p-2.5">{pc.max_hp}</td>
              <td className="p-2.5">{pc.locked ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-base font-semibold mt-6 mb-2 text-neutral-400">Winning Compositions</h2>
      {user.winning_compositions.length === 0 ? (
        <p className="text-neutral-500 text-sm">No wins recorded yet.</p>
      ) : (
        <table className="border-collapse">
          <thead>
            <tr className="border-b-2 border-neutral-600 text-left">
              <th className="p-2.5">Archetypes</th>
              <th className="p-2.5">Wins</th>
            </tr>
          </thead>
          <tbody>
            {user.winning_compositions.map(({ archetypes, count }) => (
              <tr key={archetypes.join('+')} className="border-b border-neutral-700">
                <td className="p-2.5">{archetypes.join(' + ')}</td>
                <td className="p-2.5">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
cd apps/web && npm test -- --run src/pages/admin/AdminUserDetailPage.test.tsx
```

Expected: all pass.

- [ ] **Step 6: Check LSP**

Run LSP diagnostics on `apps/web/src/pages/admin/AdminUserDetailPage.tsx` and `apps/web/src/App.tsx`. Expected: 0 errors.

- [ ] **Step 7: Run full test suite**

```bash
cd apps/web && npm test -- --run
```

Expected: all existing tests still pass.

- [ ] **Step 8: Commit**

```bash
cd apps/web && git add src/pages/admin/AdminUserDetailPage.tsx src/pages/admin/AdminUserDetailPage.test.tsx src/App.tsx
git commit -m "feat: add AdminUserDetailPage with game record, characters, and winning compositions"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd apps/api && bundle exec rspec --format progress
```

Expected: all green.

- [ ] **Step 2: Run full frontend test suite**

```bash
cd apps/web && npm test -- --run
```

Expected: all pass.

- [ ] **Step 3: Check LSP across all modified frontend files**

Run LSP diagnostics on:
- `apps/web/src/api/admin.ts`
- `apps/web/src/pages/admin/AdminHomePage.tsx`
- `apps/web/src/pages/admin/AdminUsersPage.tsx`
- `apps/web/src/pages/admin/AdminUserDetailPage.tsx`
- `apps/web/src/App.tsx`

Expected: 0 errors across all files.
