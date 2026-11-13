# GRIDIRON // NFL Standings, Tiebreaker & Telemetry Command Center

A keyboard-first, dark sports-analytics broadcast web application for tracking live and historical NFL standings, official multi-team tiebreakers, box scores, play-by-play drives, team/player statistics, and interactive playoff seeding scenarios.

---

## Features

### 1. Standings & Playoff Picture
- **Multiple Grouping Modes**: Switch between **By Division** (all 8 AFC/NFC divisions), **Playoff Picture (Conference)** (Seeds 1–16 with visual cutlines at Seed #4 and Seed #7), and **Full League (1–32)** sortable tables.
- **Projected Playoff Bracket**: Interactive AFC and NFC Wild Card bracket preview showing the #1 Seed First-Round Bye and `#2 vs #7`, `#3 vs #6`, and `#4 vs #5` matchups.
- **Explainable NFL Tiebreakers (`TB`)**: Hover over any `TB` badge to see the exact NFL tiebreaker rule and metric that broke a division or wild card tie.

### 2. Full NFL Tiebreaker Engine
Dynamically computes division ranks (1–4) and conference seeds (1–16) from all 272 regular-season games using official NFL 2-club and 3+-club procedures:
- Head-to-Head record & multi-team H2H sweep checks
- Same-division reduction for multi-team Wild Card ties
- Division Win % & Conference Win %
- Common Games Win % (enforcing the NFL 4-game minimum)
- Strength of Victory (**SOV**) & Strength of Schedule (**SOS**)
- Net Point Differential fallback

### 3. Live Scoreboard & Full Game Center
- **Season & Week Navigation**: Browse Preseason, Regular Season (Weeks 1–18 or Full Season view), and Postseason across current and historical seasons (`2020`–present), with automatic 30-second live game polling.
- **Full Game Center Drawer**: Click any matchup card to inspect:
  - Chronological **Scoring Summary** by quarter
  - **Real-Time Win Probability** SVG area chart
  - **Team Telemetry** dual-bar comparison (Total Yards, Passing, Rushing, Yards/Play, 1st Downs, 3rd/4th Down %, Red Zone, Turnovers, Penalties, Time of Possession)
  - **Player Box Scores** (Passing, Rushing, Receiving, Defense, Kicking/Punting)
  - Expandable **Drive Chart & Play-by-Play** breakdown

### 4. Interactive Playoff Machine & Scenario Simulator
- Simulate remaining regular-season games—or override already-completed games for historical "what-if" scenarios—with sub-millisecond seeding recalculation.
- **Auto-Fill Presets**: *By Win %*, *By Point Diff*, *All Home Teams*, and *Reset*.
- **Live Seed Delta Indicators**: Tracks real-time seed movement (`▲ +2`, `▼ -1`, `NEW IN`, `OUT`) against baseline standings.
- **Persistent SQLite Scenarios**: Save, load, and manage named playoff scenarios in the local SQLite database.

### 5. Team & Player Telemetry + Visual Analytics
- **Offense vs. Defense Quadrant Scatter Plot**: Plots all 32 NFL team logos on an interactive 2D plane (*Offensive PPG / YPG* vs. *Defensive PAPG / YPG Allowed*) with league-average crosshairs.
- **Sortable 32-Team Rankings**: Sort by Offense PPG, Defense PAPG, Point Diff/G, Total YPG, Pass YPG, Rush YPG, Def YPG, 3rd Down %, Red Zone %, Turnover Diff, and Sacks.
- **Player Stat Leaderboards & Watchlist**: Passing, Rushing, Receiving, Defense, and Kicking leaders with 1-click pinning to your persistent **Player Watchlist**.
- **Head-to-Head Franchise Comparator**: Side-by-side percentile bar comparison between any two NFL teams.

### 6. Franchise Deep-Dive & `Ctrl+K` Command Palette
- Press `Ctrl+K` (or `/`) anywhere to fuzzy-search all **32 NFL franchises**, stat leaders, or schedule weeks.
- Every franchise page features a dynamic team-color hero banner, **Spotlight** pinning, **Full Season Schedule** (including automatic Bye Week detection and 1-click Box Score links), filterable **Active Roster**, and **Injury Report**.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js (v22.5+), Hono (`@hono/node-server`)
- **Database**: Built-in `node:sqlite` (`DatabaseSync` with WAL mode) for zero-dependency local SQLite caching and user state persistence
- **Data Source**: Public ESPN NFL JSON endpoints (zero API keys required)

---

## Getting Started

### Prerequisites
- **Node.js v22.5+** (uses the built-in `node:sqlite` module and native TypeScript execution)
- **npm**

### Installation

```bash
git clone https://github.com/rht341/nfl-tracker.git
cd nfl-tracker
npm install
```

### Running the Application

#### Option 1: Single-Port Production Build + Server (Port `3001`)
```bash
npm run build
npm run dev:server
```
Open **http://127.0.0.1:3001** in your browser.

#### Option 2: Full Development Mode with Hot Reload (Vite `5173` + API `3001`)
```bash
npm run dev
```
Open **http://127.0.0.1:5173** in your browser.

---

## Local API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/meta` | Active NFL season year, season type, current week, and historical seasons list |
| `GET` | `/api/standings?season=:yr` | Full 32-team standings, tiebreakers, SOV/SOS, and all 272 regular-season games |
| `GET` | `/api/scoreboard?season=:yr&type=:t&week=:wk` | Weekly or full-season (`week=0`) scoreboard with linescores & game leaders |
| `GET` | `/api/game/:eventId` | Full Game Center summary (scoring plays, team stats, box scores, drives, win prob) |
| `GET` | `/api/stats/teams?season=:yr` | 32-team offensive & defensive season telemetry |
| `GET` | `/api/stats/players?season=:yr` | Player stat leaderboards across Passing, Rushing, Receiving, Defense, and Kicking |
| `GET` | `/api/teams/:teamId?season=:yr` | Franchise deep-dive: standing, schedule, active roster, and injury report |
| `GET` | `/api/user/state?season=:yr` | User's saved favorite teams, player watchlist, and playoff scenarios from SQLite |
| `POST` | `/api/user/favorites/toggle` | Pin or unpin an NFL team in the Spotlight bar |
| `POST/DELETE` | `/api/user/watchlist` | Add or remove a player from the persistent Watchlist |
| `POST/DELETE` | `/api/user/scenarios` | Save or delete a custom Playoff Machine scenario |

---

## Project Structure

```text
nfl-tracker/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server/
│   ├── index.ts              # Hono server entry point & static asset server
│   ├── db.ts                 # node:sqlite schema, TTL cache & user state queries
│   ├── espnClient.ts         # Resilient ESPN fetcher with SQLite TTL & stale fallback
│   ├── normalizers.ts        # Transforms raw ESPN payloads into typed models
│   └── routes/
│       ├── nfl.ts            # NFL data & 18-week season schedule aggregator routes
│       └── user.ts           # Favorites, Watchlist & Playoff Scenario persistence routes
└── src/
    ├── main.tsx
    ├── App.tsx               # App shell, keyboard shortcuts & 30s live polling
    ├── index.css             # Tailwind v4 & broadcast monospace styling
    ├── types/
    │   └── nfl.ts            # Shared TypeScript interfaces
    ├── utils/
    │   ├── nflTeams.ts       # Static 32-team directory (IDs, colors, divisions, logos)
    │   └── tiebreaker.ts     # Full NFL 2-team & multi-team tiebreaker engine
    └── components/
        ├── TopBar.tsx        # Header navigation, season switcher & Spotlight bar
        ├── CommandPalette.tsx# Ctrl+K quick-jump modal
        ├── StandingsView.tsx # Division/Conf/League standings & Playoff Bracket
        ├── ScoreboardView.tsx# Live scoreboard cards & team/week filters
        ├── GameCenterModal.tsx# Box scores, scoring summary, drives & win prob chart
        ├── PlayoffMachine.tsx# Interactive scenario simulator & SQLite scenario manager
        ├── StatsView.tsx     # Off/Def quadrant scatter plot, leaderboards & H2H tool
        └── TeamDetailView.tsx# Franchise deep-dive (Schedule, Roster, Injuries)
```
