# DTO Backlog

## Bugs

- [ ] Friend Request shows "Unknown User"
- [ ] Remove "Offline" badge from Friends area of Dashboard
- [ ] add a flashing border around the tile for the character whose turn it is
- [ ] Movement zone showed all the options for where the character could move, but only allowed me to move them one square and then I was unable to make another "move". Each character should be allowed to move until they no longer have moves to make - meaning they could move one square, attack an opponent, and then move two more squares. once they've exhausted all three moves, then we should gray out movement as an option in the action popup.
- [ ] i didn't get to choose tiles for my characters

## Ready

Items scoped and designed, ready for planning.

- [x] **Phase 2: Multi-Character & Board Expansion** — 2 characters per player, 12x12 board, d20 initiative system, 2x2 corner start zones, tile-based board config schema
- [x] **Tailwind CSS + Full Restyle** — Add Tailwind to the frontend, restyle all existing Phase 1 UI and new Phase 2 UI
- [x] **Initiative System** — d20 roll per character at game start, fixed turn order for entire game, tie re-rolls, extensible for future DEX modifiers
- [x] **Character Names** — Build a fantasy name library, randomly assign names to characters at game start
- [x] **Board Config Schema Migration** — Move from `blocked_squares` list to tile-based schema (`{ type: "open" | "blocked" }`) to support future terrain types
- [x] **Swappable Character Renderer** — `CharacterRenderer` component that takes a rendering mode (token now, sprites later)

## Account & UX

- [ ] Password reset flow (email-based)
- [ ] Profile editing (username, email, password change)
- [ ] Game invite expiration timer (auto-decline after timeout)
- [ ] Post-game history/replay (view completed games after they end)
- [ ] In-game rewind mode (scrub through action history mid-game)

## Future Phases

Ideas discussed but explicitly deferred. Will need full design sessions before implementation.

### Gameplay

- [ ] Show turn order in a banner across the top of a game
- [ ] Character classes and races (D&D-style stat differences, abilities)
- [ ] Full character creation flow (choose race, class, name, abilities)
- [ ] Character progression and leveling
- [ ] Advanced combat — status effects, environmental factors, multi-target/cleave attacks
- [ ] Haste/Slow/Stop spells affecting initiative order
- [ ] Fog of war
- [ ] AI opponents
- [ ] Player classification - We'll generate game logs as users play, I want to mine those logs to see how players attempt to play the game, the tactics they imploy, the types of characters they use, etc. I want AI opponents to play at the player's rank, but I also want the AI opponent to adapt how they play.

### Board & Visuals

- [ ] 3D board rendering with elevation
- [ ] Terrain types with gameplay effects (grass, stone, water)
- [ ] Admin board builder tool (create and share custom boards)
- [ ] Board as a first-class stored/shareable entity (separate `Board` model)
- [ ] Final Fantasy Tactics-style sprites

### Social & Competitive

- [ ] Tournaments
- [ ] Spectator mode
- [ ] Player rankings / leaderboards
- [ ] In-game chat

## Administration

- [ ] User/player roles - I want to be able to designate users as 'admin' users that can create and edit boards
- [ ] Board status - 'draft', 'active', 'archived'
- [ ] Board editor - I want a UI for admin users to create/modify boards

## Open Questions

Decisions still needed before some items above can be planned:

- Password reset email provider — Action Mailer + SMTP? SendGrid? Resend?
- Game invite expiry duration — 24hrs? 48hrs? Configurable?
- Rewind mode UX — step-by-step buttons vs. timeline scrubber?
- Profile editing scope — can users change username, or just email/password?
- Game history visibility — viewable by both players or only the winner?
- Character placement UI — drag-and-drop vs. click-to-assign?
