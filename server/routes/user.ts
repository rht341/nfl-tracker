import { Hono } from 'hono';
import {
  deletePlayoffScenario,
  getFavoriteTeams,
  getPlayoffScenarios,
  getWatchlist,
  removeWatchlistPlayer,
  savePlayoffScenario,
  toggleFavoriteTeam,
  upsertWatchlistPlayer,
} from '../db.ts';

export const userRoutes = new Hono();

// GET /api/user/state -> returns favorites, watchlist, scenarios in one call
userRoutes.get('/state', (c) => {
  const season = c.req.query('season') ? Number(c.req.query('season')) : undefined;
  return c.json({
    favorites: getFavoriteTeams(),
    watchlist: getWatchlist(),
    scenarios: getPlayoffScenarios(season),
  });
});

// POST /api/user/favorites/toggle
userRoutes.post('/favorites/toggle', async (c) => {
  const body = await c.req.json<{ teamId: string; teamAbbr: string }>();
  if (!body.teamId || !body.teamAbbr) {
    return c.json({ error: 'teamId and teamAbbr required' }, 400);
  }
  const result = toggleFavoriteTeam(String(body.teamId), String(body.teamAbbr));
  return c.json({ ...result, favorites: getFavoriteTeams() });
});

// POST /api/user/watchlist
userRoutes.post('/watchlist', async (c) => {
  const body = await c.req.json<{
    athleteId: string;
    fullName: string;
    position: string;
    teamAbbr: string;
    headshotUrl?: string;
    notes?: string;
  }>();
  if (!body.athleteId || !body.fullName) {
    return c.json({ error: 'athleteId and fullName required' }, 400);
  }
  upsertWatchlistPlayer({
    athleteId: String(body.athleteId),
    fullName: String(body.fullName),
    position: String(body.position || ''),
    teamAbbr: String(body.teamAbbr || ''),
    headshotUrl: String(body.headshotUrl || ''),
    notes: String(body.notes || ''),
  });
  return c.json({ watchlist: getWatchlist() });
});

// DELETE /api/user/watchlist/:athleteId
userRoutes.delete('/watchlist/:athleteId', (c) => {
  const athleteId = c.req.param('athleteId');
  removeWatchlistPlayer(athleteId);
  return c.json({ watchlist: getWatchlist() });
});

// POST /api/user/scenarios
userRoutes.post('/scenarios', async (c) => {
  const body = await c.req.json<{
    id?: string;
    name: string;
    seasonYear: number;
    picks: Record<string, 'home' | 'away' | 'tie'>;
  }>();
  if (!body.name || !body.seasonYear) {
    return c.json({ error: 'name and seasonYear required' }, 400);
  }
  const id = body.id || `scen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const saved = savePlayoffScenario(id, body.name, Number(body.seasonYear), body.picks || {});
  return c.json({ scenario: saved, scenarios: getPlayoffScenarios(Number(body.seasonYear)) });
});

// DELETE /api/user/scenarios/:id
userRoutes.delete('/scenarios/:id', (c) => {
  const id = c.req.param('id');
  const season = c.req.query('season') ? Number(c.req.query('season')) : undefined;
  deletePlayoffScenario(id);
  return c.json({ scenarios: getPlayoffScenarios(season) });
});
