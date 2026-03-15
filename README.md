# DTO - DnD Tactics Game

A real-time tactics game engine built with Rails, React, and PostgreSQL. Fight enemies on turn-based grid-based battlefields with live multiplayer synchronization via WebSockets.

## Tech Stack

- **Backend**: Rails 8 API (Ruby 3.3.0)
- **Frontend**: React 19 + Vite + TypeScript
- **Database**: PostgreSQL 15+
- **State Management**: Redux Toolkit
- **Real-time**: Action Cable (WebSocket)
- **Job Queue**: Solid Queue

## Prerequisites

- **Ruby 3.3.0** (enforced via `.ruby-version`)
- **Node.js 20+** (for React development)
- **PostgreSQL 15+** (for database)

## Project Structure

```
dto/
├── apps/
│   ├── api/          # Rails 8 API backend
│   └── web/          # React + Vite frontend
├── README.md         # This file
├── .gitignore        # Git configuration
└── .ruby-version     # Ruby version specification
```

## Quick Start

### Prerequisites Check

```bash
# Check Ruby version
ruby --version  # must be 3.3.0

# Check Node version
node --version  # must be 20 or higher

# Check PostgreSQL
psql --version  # must be 15 or higher
```

### Backend Setup (Rails API)

```bash
cd apps/api

# Install dependencies
bundle install

# Setup database
rails db:create
rails db:migrate

# Run tests
bundle exec rspec

# Start server (port 4000)
rails s -p 4000
```

### Frontend Setup (React + Vite)

```bash
cd apps/web

# Install dependencies
npm install

# Run tests
npm run test

# Start dev server (port 4001)
npm run dev
```

## Development Workflow

### Ports Assignment

- **Backend**: http://localhost:4000 (Rails API)
- **Frontend**: http://localhost:4001 (React Vite dev server)

### Running Both Services

Terminal 1 (Backend):
```bash
cd apps/api
rails s -p 4000
```

Terminal 2 (Frontend):
```bash
cd apps/web
npm run dev
```

### Testing

**Backend tests**:
```bash
cd apps/api
bundle exec rspec
```

**Frontend tests**:
```bash
cd apps/web
npm run test
```

## Architecture Overview

### Backend (Rails API)

- RESTful API endpoints for game state management
- WebSocket support via Action Cable for real-time updates
- JWT authentication (15-minute access tokens, 30-day refresh tokens)
- Solid Queue for background jobs
- PostgreSQL database with game state persistence

### Frontend (React)

- Redux Toolkit for centralized state management
- Vite for fast development and optimized builds
- TypeScript for type safety
- Real-time board updates via WebSocket
- Turn-based game mechanics UI

### Game Mechanics

- **Board**: Grid-based with configurable blocked squares
- **Movement**: Cardinal directions only (up, down, left, right)
- **Positions**: 1-indexed integer coordinates {x, y}
- **Turn System**: Turn-based with action queue
- **Multiplayer**: Real-time synchronization via WebSockets

## Environment Configuration

Create `.env` files in both `apps/api` and `apps/web` with appropriate configuration (see individual app documentation).

## Contributing

Follow Rails and React best practices. All commits must pass tests before merging.

## License

MIT
