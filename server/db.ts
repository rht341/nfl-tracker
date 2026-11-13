import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SavedPlayoffScenario, WatchlistPlayer } from '../src/types/nfl.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../nfl-tracker.sqlite');

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS api_cache (
    cache_key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    is_immutable INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS favorite_teams (
    team_id TEXT PRIMARY KEY,
    team_abbr TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS player_watchlist (
    athlete_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,
    team_abbr TEXT NOT NULL,
    headshot_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS playoff_scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    season_year INTEGER NOT NULL,
    picks_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

export function getCachedJson<T>(key: string, allowStale = false): T | null {
  const row = db
    .prepare('SELECT payload_json, expires_at FROM api_cache WHERE cache_key = ?')
    .get(key) as { payload_json: string; expires_at: number } | undefined;

  if (!row) return null;
  if (!allowStale && Date.now() > row.expires_at) {
    return null;
  }
  try {
    return JSON.parse(row.payload_json) as T;
  } catch {
    return null;
  }
}

export function setCachedJson(key: string, payload: unknown, ttlSeconds: number, isImmutable = false): void {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  db.prepare(
    `INSERT INTO api_cache (cache_key, payload_json, fetched_at, expires_at, is_immutable)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       fetched_at = excluded.fetched_at,
       expires_at = excluded.expires_at,
       is_immutable = excluded.is_immutable`
  ).run(key, JSON.stringify(payload), now, expiresAt, isImmutable ? 1 : 0);
}

export function getFavoriteTeams(): { teamId: string; teamAbbr: string }[] {
  const rows = db
    .prepare('SELECT team_id, team_abbr FROM favorite_teams ORDER BY display_order ASC, created_at ASC')
    .all() as { team_id: string; team_abbr: string }[];
  return rows.map((r) => ({ teamId: r.team_id, teamAbbr: r.team_abbr }));
}

export function toggleFavoriteTeam(teamId: string, teamAbbr: string): { favorited: boolean } {
  const existing = db.prepare('SELECT team_id FROM favorite_teams WHERE team_id = ?').get(teamId);
  if (existing) {
    db.prepare('DELETE FROM favorite_teams WHERE team_id = ?').run(teamId);
    return { favorited: false };
  }
  db.prepare(
    'INSERT INTO favorite_teams (team_id, team_abbr, display_order, created_at) VALUES (?, ?, 0, ?)'
  ).run(teamId, teamAbbr, Date.now());
  return { favorited: true };
}

export function getWatchlist(): WatchlistPlayer[] {
  const rows = db
    .prepare(
      'SELECT athlete_id, full_name, position, team_abbr, headshot_url, notes, created_at FROM player_watchlist ORDER BY created_at DESC'
    )
    .all() as {
    athlete_id: string;
    full_name: string;
    position: string;
    team_abbr: string;
    headshot_url: string;
    notes: string;
    created_at: number;
  }[];
  return rows.map((r) => ({
    athleteId: r.athlete_id,
    fullName: r.full_name,
    position: r.position,
    teamAbbr: r.team_abbr,
    headshotUrl: r.headshot_url,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export function upsertWatchlistPlayer(player: Omit<WatchlistPlayer, 'createdAt'>): void {
  db.prepare(
    `INSERT INTO player_watchlist (athlete_id, full_name, position, team_abbr, headshot_url, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(athlete_id) DO UPDATE SET
       full_name = excluded.full_name,
       position = excluded.position,
       team_abbr = excluded.team_abbr,
       headshot_url = excluded.headshot_url,
       notes = excluded.notes`
  ).run(
    player.athleteId,
    player.fullName,
    player.position,
    player.teamAbbr,
    player.headshotUrl || '',
    player.notes || '',
    Date.now()
  );
}

export function removeWatchlistPlayer(athleteId: string): void {
  db.prepare('DELETE FROM player_watchlist WHERE athlete_id = ?').run(athleteId);
}

export function getPlayoffScenarios(seasonYear?: number): SavedPlayoffScenario[] {
  const rows = (
    seasonYear
      ? db
          .prepare(
            'SELECT id, name, season_year, picks_json, created_at, updated_at FROM playoff_scenarios WHERE season_year = ? ORDER BY updated_at DESC'
          )
          .all(seasonYear)
      : db
          .prepare(
            'SELECT id, name, season_year, picks_json, created_at, updated_at FROM playoff_scenarios ORDER BY updated_at DESC'
          )
          .all()
  ) as {
    id: string;
    name: string;
    season_year: number;
    picks_json: string;
    created_at: number;
    updated_at: number;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    seasonYear: r.season_year,
    picks: JSON.parse(r.picks_json || '{}'),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function savePlayoffScenario(
  id: string,
  name: string,
  seasonYear: number,
  picks: Record<string, 'home' | 'away' | 'tie'>
): SavedPlayoffScenario {
  const now = Date.now();
  db.prepare(
    `INSERT INTO playoff_scenarios (id, name, season_year, picks_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       season_year = excluded.season_year,
       picks_json = excluded.picks_json,
       updated_at = excluded.updated_at`
  ).run(id, name, seasonYear, JSON.stringify(picks), now, now);

  return {
    id,
    name,
    seasonYear,
    picks,
    createdAt: now,
    updatedAt: now,
  };
}

export function deletePlayoffScenario(id: string): void {
  db.prepare('DELETE FROM playoff_scenarios WHERE id = ?').run(id);
}
