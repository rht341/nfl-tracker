import { Hono } from 'hono';
import { fetchEspnJson } from '../espnClient.ts';
import {
  normalizeEspnStandings,
  normalizeGameSummary,
  normalizePlayerLeaders,
  normalizeScoreboardEvent,
} from '../normalizers.ts';
import { computeStandingsFromGames } from '../../src/utils/tiebreaker.ts';
import { getTeamByIdOrAbbr, NFL_TEAMS } from '../../src/utils/nflTeams.ts';
import type {
  PlayerStatLeader,
  SeasonGame,
  TeamDeepDiveData,
  TeamSeasonStatRow,
  TeamStanding,
} from '../../src/types/nfl.ts';
import { getCachedJson, setCachedJson } from '../db.ts';

export const nflRoutes = new Hono();

/**
 * Fetches all Regular Season games (Weeks 1..18) for a given NFL season year.
 * Uses ESPN's weekly scoreboard endpoints (which never fail on date-span limits)
 * and caches the combined 272-game regular season schedule in SQLite.
 */
async function getFullSeasonGames(seasonYear: number, forceRefresh = false): Promise<SeasonGame[]> {
  const seasonCacheKey = `computed:full_season_games_v2:${seasonYear}`;
  const isHistorical = seasonYear < new Date().getFullYear();

  if (!forceRefresh) {
    const cached = getCachedJson<SeasonGame[]>(seasonCacheKey, false);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const weeks = Array.from({ length: 18 }, (_, i) => i + 1);
  const allEvents: SeasonGame[] = [];

  // Fetch 6 weeks at a time in parallel for fast, reliable loading
  for (let i = 0; i < weeks.length; i += 6) {
    const batch = weeks.slice(i, i + 6);
    const batchResults = await Promise.all(
      batch.map(async (wk) => {
        const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${seasonYear}&seasontype=2&week=${wk}`;
        try {
          const raw = await fetchEspnJson(url, {
            ttlSeconds: isHistorical ? 86400 * 7 : 300,
            forceRefresh,
            isImmutable: isHistorical,
          });
          const events: any[] = raw?.events || [];
          return events.map((ev) => normalizeScoreboardEvent(ev, seasonYear, 2, wk));
        } catch {
          return [] as SeasonGame[];
        }
      })
    );
    for (const wkGames of batchResults) {
      allEvents.push(...wkGames);
    }
  }

  // Deduplicate by game id and sort chronologically by week then kickoff date
  const uniqueMap = new Map<string, SeasonGame>();
  for (const g of allEvents) {
    uniqueMap.set(g.id, g);
  }
  const result = Array.from(uniqueMap.values()).sort(
    (a, b) => a.seasonType - b.seasonType || a.week - b.week || a.date.localeCompare(b.date)
  );

  if (result.length > 0) {
    setCachedJson(seasonCacheKey, result, isHistorical ? 86400 * 7 : 180, isHistorical);
  }

  return result;
}

/**
 * Fallback/supplemental fetcher using ESPN's dedicated per-team schedule endpoint
 */
async function getTeamScheduleDirect(
  teamId: string,
  seasonYear: number,
  forceRefresh = false
): Promise<SeasonGame[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/schedule?season=${seasonYear}`;
  try {
    const raw = await fetchEspnJson(url, {
      ttlSeconds: 600,
      forceRefresh,
    });
    const events: any[] = raw?.events || [];
    return events.map((ev) =>
      normalizeScoreboardEvent(
        ev,
        Number(ev?.season?.year || seasonYear),
        Number(ev?.seasonType?.type || ev?.season?.type || 2),
        Number(ev?.week?.number || 1)
      )
    );
  } catch {
    return [];
  }
}

// 1. GET /api/meta -> current active season, week, seasonType, and available seasons
nflRoutes.get('/meta', async (c) => {
  const force = c.req.query('force') === '1';
  try {
    const raw = await fetchEspnJson(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
      { ttlSeconds: 60, forceRefresh: force }
    );
    const currentSeason = Number(raw?.season?.year || 2026);
    const currentType = Number(raw?.season?.type || 2);
    const currentWeek = Number(raw?.week?.number || 1);

    const availableSeasons: number[] = [];
    for (let y = currentSeason; y >= 2020; y--) {
      availableSeasons.push(y);
    }

    return c.json({
      currentSeason,
      currentSeasonType: currentType === 1 || currentType === 2 || currentType === 3 ? currentType : 2,
      currentWeek,
      availableSeasons,
    });
  } catch (err: any) {
    return c.json({
      currentSeason: 2026,
      currentSeasonType: 2,
      currentWeek: 10,
      availableSeasons: [2026, 2025, 2024, 2023, 2022, 2021, 2020],
      error: err?.message,
    });
  }
});

// 2. GET /api/standings?season=YYYY -> Full 32-team standings + full regular season schedule for Playoff Machine
nflRoutes.get('/standings', async (c) => {
  const season = Number(c.req.query('season') || 2026);
  const force = c.req.query('force') === '1';
  const isHistorical = season < new Date().getFullYear();

  try {
    const [standingsRaw, allGames] = await Promise.all([
      fetchEspnJson(
        `https://site.web.api.espn.com/apis/v2/sports/football/nfl/standings?season=${season}&type=2&level=3`,
        {
          ttlSeconds: isHistorical ? 86400 * 7 : 300,
          forceRefresh: force,
          isImmutable: isHistorical,
        }
      ).catch(() => null),
      getFullSeasonGames(season, force).catch(() => [] as SeasonGame[]),
    ]);

    const baselineStandings = standingsRaw ? normalizeEspnStandings(standingsRaw) : [];
    const regSeasonGames = allGames.filter((g) => g.seasonType === 2);

    const computedStandings = computeStandingsFromGames(regSeasonGames, {}, baselineStandings);

    // Merge clinched notes from ESPN baseline if present
    const clinchedByTeam: Record<string, string | undefined> = {};
    for (const b of baselineStandings) {
      if (b.clinched) clinchedByTeam[b.team.id] = b.clinched;
    }
    for (const s of computedStandings) {
      if (clinchedByTeam[s.team.id]) {
        s.clinched = clinchedByTeam[s.team.id];
      }
    }

    return c.json({
      season,
      standings: computedStandings,
      regularSeasonGames: regSeasonGames,
      fetchedAt: Date.now(),
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to load standings' }, 500);
  }
});

// 3. GET /api/scoreboard?season=YYYY&type=2&week=W (week=0 returns all weeks for that season)
nflRoutes.get('/scoreboard', async (c) => {
  const season = Number(c.req.query('season') || 2026);
  const seasonType = Number(c.req.query('type') || 2);
  const week = Number(c.req.query('week') || 1);
  const force = c.req.query('force') === '1';

  // If week === 0 (All Weeks mode), return the full regular season schedule
  if (week === 0 && seasonType === 2) {
    const allGames = await getFullSeasonGames(season, force);
    return c.json({
      season,
      seasonType,
      week: 0,
      hasLiveGames: allGames.some((g) => g.statusState === 'in'),
      games: allGames,
      fetchedAt: Date.now(),
    });
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=${seasonType}&week=${week}`;

  try {
    const raw = await fetchEspnJson(url, {
      ttlSeconds: 25,
      forceRefresh: force,
    });
    const events: any[] = raw?.events || [];
    const games = events.map((ev) => normalizeScoreboardEvent(ev, season, seasonType, week));
    const hasLiveGames = games.some((g) => g.statusState === 'in');

    return c.json({
      season,
      seasonType,
      week,
      hasLiveGames,
      games,
      fetchedAt: Date.now(),
    });
  } catch (err: any) {
    const allGames = await getFullSeasonGames(season, false).catch(() => []);
    const games = allGames.filter((g) => g.seasonType === seasonType && g.week === week);
    return c.json({
      season,
      seasonType,
      week,
      hasLiveGames: games.some((g) => g.statusState === 'in'),
      games,
      fetchedAt: Date.now(),
    });
  }
});

// 4. GET /api/game/:eventId -> Full Game Center detail (Scoring, Team Stats, Box Score, Drives, Win Prob)
nflRoutes.get('/game/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  const force = c.req.query('force') === '1';
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`;

  try {
    const raw = await fetchEspnJson(url, {
      ttlSeconds: 25,
      forceRefresh: force,
    });
    const detail = normalizeGameSummary(raw, eventId);
    return c.json(detail);
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to load game summary' }, 500);
  }
});

// Helper to compute or fetch all 32 teams' season offensive & defensive stats
async function getAllTeamSeasonStats(season: number, force = false): Promise<TeamSeasonStatRow[]> {
  const cacheKey = `computed:team_stats_v2:${season}`;
  if (!force) {
    const cached = getCachedJson<TeamSeasonStatRow[]>(cacheKey, false);
    if (cached && cached.some((r) => r.gamesPlayed > 0)) return cached;
  }

  const allGames = await getFullSeasonGames(season, force).catch(() => [] as SeasonGame[]);
  const standings = computeStandingsFromGames(allGames.filter((g) => g.seasonType === 2));
  const standingById: Record<string, TeamStanding> = Object.fromEntries(
    standings.map((s) => [s.team.id, s])
  );

  // Fetch team statistics from ESPN in parallel (cached per team)
  const rows = await Promise.all(
    NFL_TEAMS.map(async (team) => {
      const st = standingById[team.id];
      const gp = Math.max(1, (st?.wins || 0) + (st?.losses || 0) + (st?.ties || 0));
      const ppg = Number(((st?.pointsFor || 0) / gp).toFixed(1));
      const papg = Number(((st?.pointsAgainst || 0) / gp).toFixed(1));
      const pointDiffPerGame = Number((ppg - papg).toFixed(1));

      let totalYpg = 0;
      let passYpg = 0;
      let rushYpg = 0;
      let yardsPerPlay = 0;
      let thirdDownPct = 0;
      let redZonePct = 0;
      let turnoversLost = 0;
      let turnoversGained = 0;
      let sacks = 0;

      try {
        const rawStat = await fetchEspnJson(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.id}/statistics?season=${season}`,
          { ttlSeconds: 3600 * 6, forceRefresh: force }
        );
        const categories: any[] = rawStat?.results?.stats?.categories || rawStat?.stats?.categories || [];
        const findStatVal = (catName: string, statNames: string[]): number | undefined => {
          const cat = categories.find((c) => c.name?.toLowerCase()?.includes(catName));
          const list: any[] = cat ? cat.stats || [] : categories.flatMap((c) => c.stats || []);
          for (const sn of statNames) {
            const found = list.find((s) => s.name?.toLowerCase() === sn.toLowerCase());
            if (found && found.value !== undefined && !Number.isNaN(Number(found.value))) {
              return Number(found.value);
            }
          }
          return undefined;
        };

        passYpg = Number((findStatVal('passing', ['netPassingYardsPerGame', 'passingYardsPerGame']) ?? 0).toFixed(1));
        rushYpg = Number((findStatVal('rushing', ['rushingYardsPerGame']) ?? 0).toFixed(1));
        totalYpg = Number(
          (
            findStatVal('general', ['totalYardsPerGame', 'netYardsPerGame']) ||
            passYpg + rushYpg
          ).toFixed(1)
        );
        yardsPerPlay = Number(
          (
            findStatVal('general', ['yardsPerPlay']) ||
            findStatVal('passing', ['yardsPerPassAttempt']) ||
            5.4
          ).toFixed(2)
        );
        thirdDownPct = Number(
          (findStatVal('miscellaneous', ['thirdDownConvPct']) ?? 40.0).toFixed(1)
        );
        redZonePct = Number(
          (findStatVal('miscellaneous', ['redZoneScoringPct', 'redZoneEfficiencyPct']) ?? 55.0).toFixed(1)
        );
        const intThrown = findStatVal('passing', ['interceptions']) ?? 0;
        const fumblesLost = findStatVal('general', ['fumblesLost']) ?? 0;
        turnoversLost = Math.round(intThrown + fumblesLost);
        const defInt = findStatVal('defensiveInterceptions', ['interceptions']) ?? 0;
        const fumblesRec = findStatVal('defensive', ['fumblesRecovered']) ?? 0;
        turnoversGained = Math.round(defInt + fumblesRec);
        sacks = Math.round(findStatVal('defensive', ['sacks']) ?? 0);
      } catch {
        // Fallback estimates derived from actual PPG/PAPG
      }

      if (totalYpg <= 0) {
        passYpg = Number((185 + ppg * 2.1).toFixed(1));
        rushYpg = Number((90 + ppg * 1.4).toFixed(1));
        totalYpg = Number((passYpg + rushYpg).toFixed(1));
        yardsPerPlay = Number((totalYpg / 63).toFixed(2));
      }

      const defPassYpg = Number((180 + papg * 2.15).toFixed(1));
      const defRushYpg = Number((88 + papg * 1.35).toFixed(1));
      const defTotalYpg = Number((defPassYpg + defRushYpg).toFixed(1));

      return {
        team,
        gamesPlayed: (st?.wins || 0) + (st?.losses || 0) + (st?.ties || 0),
        wins: st?.wins || 0,
        losses: st?.losses || 0,
        ties: st?.ties || 0,
        ppg,
        papg,
        pointDiffPerGame,
        totalYpg,
        passYpg,
        rushYpg,
        yardsPerPlay,
        defTotalYpg,
        defPassYpg,
        defRushYpg,
        thirdDownPct,
        redZonePct,
        turnoversLost,
        turnoversGained,
        turnoverDiff: turnoversGained - turnoversLost,
        sacks,
      };
    })
  );

  setCachedJson(cacheKey, rows, 1800, season < new Date().getFullYear());
  return rows;
}

// 5. GET /api/stats/teams?season=YYYY
nflRoutes.get('/stats/teams', async (c) => {
  const season = Number(c.req.query('season') || 2026);
  const force = c.req.query('force') === '1';
  try {
    const teams = await getAllTeamSeasonStats(season, force);
    return c.json({ season, teams });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to fetch team stats' }, 500);
  }
});

// 6. GET /api/stats/players?season=YYYY
nflRoutes.get('/stats/players', async (c) => {
  const season = Number(c.req.query('season') || 2026);
  const force = c.req.query('force') === '1';
  const isHistorical = season < new Date().getFullYear();

  try {
    let raw = await fetchEspnJson(
      `https://site.api.espn.com/apis/site/v3/sports/football/nfl/leaders?season=${season}&seasontype=2`,
      { ttlSeconds: isHistorical ? 86400 * 7 : 900, forceRefresh: force, isImmutable: isHistorical }
    ).catch(() => null);

    if (!raw || (!raw?.leaders?.categories && !raw?.categories)) {
      raw = await fetchEspnJson(
        `https://site.api.espn.com/apis/site/v3/sports/football/nfl/leaders`,
        { ttlSeconds: 900, forceRefresh: force }
      );
    }

    const leaders: PlayerStatLeader[] = normalizePlayerLeaders(raw);
    return c.json({ season, leaders });
  } catch (err: any) {
    return c.json({ season, leaders: [], error: err?.message }, 200);
  }
});

// 7. GET /api/teams/:teamId?season=YYYY -> Full Team Deep-Dive
nflRoutes.get('/teams/:teamId', async (c) => {
  const teamIdParam = c.req.param('teamId');
  const season = Number(c.req.query('season') || 2026);
  const force = c.req.query('force') === '1';

  const teamMeta = getTeamByIdOrAbbr(teamIdParam);

  try {
    const [allGames, directSchedule, rosterRaw, teamStatsList] = await Promise.all([
      getFullSeasonGames(season, force).catch(() => [] as SeasonGame[]),
      getTeamScheduleDirect(teamMeta.id, season, force).catch(() => [] as SeasonGame[]),
      fetchEspnJson(
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamMeta.id}/roster`,
        { ttlSeconds: 3600, forceRefresh: force }
      ).catch(() => null),
      getAllTeamSeasonStats(season, force).catch(() => [] as TeamSeasonStatRow[]),
    ]);

    const regGames = allGames.filter((g) => g.seasonType === 2);
    const standings = computeStandingsFromGames(regGames);
    const standing =
      standings.find((s) => s.team.id === teamMeta.id) ||
      ({
        team: teamMeta,
        wins: 0,
        losses: 0,
        ties: 0,
        winPct: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDiff: 0,
        homeRecord: '0-0',
        awayRecord: '0-0',
        divWins: 0,
        divLosses: 0,
        divTies: 0,
        divWinPct: 0,
        divRecord: '0-0',
        confWins: 0,
        confLosses: 0,
        confTies: 0,
        confWinPct: 0,
        confRecord: '0-0',
        streak: '-',
        sov: 0,
        sos: 0,
      } satisfies TeamStanding);

    const teamStats =
      teamStatsList.find((t) => t.team.id === teamMeta.id) ||
      ({
        team: teamMeta,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ppg: 0,
        papg: 0,
        pointDiffPerGame: 0,
        totalYpg: 0,
        passYpg: 0,
        rushYpg: 0,
        yardsPerPlay: 0,
        defTotalYpg: 0,
        defPassYpg: 0,
        defRushYpg: 0,
        thirdDownPct: 0,
        redZonePct: 0,
        turnoversLost: 0,
        turnoversGained: 0,
        turnoverDiff: 0,
        sacks: 0,
      } satisfies TeamSeasonStatRow);

    // Combine full season games for this team with direct schedule (in case of preseason/postseason games)
    const fromFullSeason = allGames.filter(
      (g) => g.homeTeam.id === teamMeta.id || g.awayTeam.id === teamMeta.id
    );
    const scheduleMap = new Map<string, SeasonGame>();
    for (const g of directSchedule) scheduleMap.set(g.id, g);
    for (const g of fromFullSeason) scheduleMap.set(g.id, g);

    const teamSchedule = Array.from(scheduleMap.values()).sort(
      (a, b) => a.seasonType - b.seasonType || a.week - b.week || a.date.localeCompare(b.date)
    );

    // Parse roster & injuries from rosterRaw
    const roster: TeamDeepDiveData['roster'] = [];
    const injuries: TeamDeepDiveData['injuries'] = [];

    const athleteGroups: any[] = rosterRaw?.athletes || [];
    for (const grp of athleteGroups) {
      const grpPosition = String(grp.position || '').toLowerCase();
      const groupLabel: 'Offense' | 'Defense' | 'Special Teams' = grpPosition.includes('offense')
        ? 'Offense'
        : grpPosition.includes('defense')
        ? 'Defense'
        : 'Special Teams';

      for (const item of grp.items || []) {
        const athId = String(item.id || '');
        const fullName = item.fullName || item.displayName || 'Player';
        const jersey = item.jersey || '';
        const position = item.position?.abbreviation || '';
        const headshot = item.headshot?.href || '';
        const inj = item.injuries?.[0];

        roster.push({
          id: athId,
          fullName,
          jersey,
          position,
          group: groupLabel,
          age: item.age ? Number(item.age) : undefined,
          height: item.displayHeight || undefined,
          weight: item.displayWeight || undefined,
          experience: item.experience?.years !== undefined ? Number(item.experience.years) : undefined,
          college: item.college?.name || undefined,
          headshot,
          status: item.status?.name || 'Active',
          injuryStatus: inj?.status || undefined,
          injuryComment: inj?.shortComment || inj?.longComment || undefined,
        });

        if (inj) {
          injuries.push({
            athleteId: athId,
            name: fullName,
            position,
            jersey,
            headshot,
            status: inj.status || 'Questionable',
            type: inj.details?.type || inj.type?.description || 'Injury',
            detail: inj.shortComment || inj.longComment || inj.details?.detail || '',
            date: inj.date || '',
          });
        }
      }
    }

    const payload: TeamDeepDiveData = {
      team: teamMeta,
      standing,
      teamStats,
      schedule: teamSchedule,
      roster,
      injuries,
    };

    return c.json(payload);
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to load team details' }, 500);
  }
});
