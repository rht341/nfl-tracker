import type {
  BoxScoreCategory,
  DriveItem,
  GameCenterDetail,
  PlayerStatLeader,
  ScoringPlay,
  SeasonGame,
  TeamStanding,
} from '../src/types/nfl.ts';
import { getTeamByIdOrAbbr, NFL_TEAMS } from '../src/utils/nflTeams.ts';

export function normalizeScoreboardEvent(
  ev: any,
  defaultSeasonYear?: number,
  defaultSeasonType?: number,
  defaultWeek?: number
): SeasonGame {
  const comp = ev?.competitions?.[0] || {};
  const competitors: any[] = comp.competitors || [];
  const homeRaw = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const awayRaw = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};

  const homeTeamMeta = getTeamByIdOrAbbr(homeRaw?.team?.id || homeRaw?.team?.abbreviation);
  const awayTeamMeta = getTeamByIdOrAbbr(awayRaw?.team?.id || awayRaw?.team?.abbreviation);

  const statusObj = comp.status || ev.status || {};
  const statusType = statusObj.type || {};
  const stateRaw = statusType.state;
  const statusState: 'pre' | 'in' | 'post' =
    stateRaw === 'in' ? 'in' : stateRaw === 'post' ? 'post' : 'pre';

  const seasonYear = Number(ev?.season?.year || defaultSeasonYear || 2026);
  const seasonType = Number(ev?.season?.type || defaultSeasonType || 2);
  const week = Number(ev?.week?.number || defaultWeek || 1);

  const postLabels: Record<number, string> = {
    1: 'Wild Card',
    2: 'Divisional',
    3: 'Conf. Championship',
    4: 'Pro Bowl',
    5: 'Super Bowl',
  };
  const weekLabel =
    seasonType === 3
      ? postLabels[week] || `Postseason Wk ${week}`
      : seasonType === 1
      ? `Preseason Wk ${week}`
      : `Week ${week}`;

  const getRecordStr = (c: any) => {
    const rec = c?.records?.find((r: any) => r.type === 'total' || r.name === 'overall') || c?.records?.[0];
    return rec?.summary || '0-0';
  };

  const getLinescores = (c: any): number[] => {
    if (!Array.isArray(c?.linescores)) return [];
    return c.linescores.map((ls: any) => Number(ls?.value ?? ls?.displayValue ?? 0));
  };

  // Extract game leaders (passing, rushing, receiving)
  const allLeaders: any[] = comp.leaders || ev.leaders || [];
  const parseLeader = (catName: string) => {
    const cat = allLeaders.find(
      (l) =>
        l?.name?.toLowerCase()?.includes(catName) ||
        l?.shortDisplayName?.toLowerCase()?.includes(catName)
    );
    const top = cat?.leaders?.[0];
    if (!top) return undefined;
    const ath = top.athlete || {};
    const tMeta = getTeamByIdOrAbbr(top.team?.id || ath.team?.id);
    return {
      name: ath.shortName || ath.displayName || 'Unknown',
      teamAbbr: tMeta.abbr,
      displayValue: top.displayValue || '',
      headshot: ath.headshot?.href || ath.headshot,
    };
  };

  const odds = comp.odds?.[0];

  return {
    id: String(ev.id || comp.id || `${seasonYear}-${week}-${awayTeamMeta.abbr}-${homeTeamMeta.abbr}`),
    seasonYear,
    seasonType,
    week,
    weekLabel,
    date: ev.date || comp.date || new Date().toISOString(),
    statusState,
    statusDetail: statusType.detail || statusType.description || 'Scheduled',
    shortDetail: statusType.shortDetail || statusType.detail || 'TBD',
    period: Number(statusObj.period || 0),
    clock: statusObj.displayClock || '0:00',
    venue: comp.venue?.fullName || '',
    broadcast:
      comp.broadcasts?.[0]?.names?.join(', ') ||
      comp.geoBroadcasts?.[0]?.media?.shortName ||
      ev.broadcast ||
      '',
    spread: odds?.details || undefined,
    overUnder: odds?.overUnder ? `O/U ${odds.overUnder}` : undefined,
    neutralSite: Boolean(comp.neutralSite),
    homeTeam: {
      id: homeTeamMeta.id,
      abbr: homeTeamMeta.abbr,
      displayName: homeTeamMeta.displayName,
      logo: homeTeamMeta.logo,
      primaryColor: homeTeamMeta.primaryColor,
      score: Number(homeRaw?.score?.value ?? homeRaw?.score ?? 0),
      record: getRecordStr(homeRaw),
      linescores: getLinescores(homeRaw),
      winner: Boolean(homeRaw?.winner),
    },
    awayTeam: {
      id: awayTeamMeta.id,
      abbr: awayTeamMeta.abbr,
      displayName: awayTeamMeta.displayName,
      logo: awayTeamMeta.logo,
      primaryColor: awayTeamMeta.primaryColor,
      score: Number(awayRaw?.score?.value ?? awayRaw?.score ?? 0),
      record: getRecordStr(awayRaw),
      linescores: getLinescores(awayRaw),
      winner: Boolean(awayRaw?.winner),
    },
    situation: comp.situation
      ? {
          possession: comp.situation.possession ? String(comp.situation.possession) : undefined,
          downDistanceText: comp.situation.downDistanceText || comp.situation.shortDownDistanceText,
          possessionText: comp.situation.possessionText,
          isRedZone: Boolean(comp.situation.isRedZone),
        }
      : undefined,
    leaders: {
      passing: parseLeader('passing'),
      rushing: parseLeader('rushing'),
      receiving: parseLeader('receiving'),
    },
  };
}

export function normalizeEspnStandings(raw: any): TeamStanding[] {
  const entries: any[] = [];

  function collectEntries(node: any) {
    if (!node) return;
    if (Array.isArray(node.standings?.entries)) {
      entries.push(...node.standings.entries);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        collectEntries(child);
      }
    }
  }

  collectEntries(raw);

  const byTeamId: Record<string, TeamStanding> = {};

  for (const entry of entries) {
    const teamRaw = entry.team || {};
    const teamMeta = getTeamByIdOrAbbr(teamRaw.id || teamRaw.abbreviation);
    const stats: any[] = entry.stats || [];

    const getStatVal = (names: string[], fallback = 0): number => {
      for (const n of names) {
        const s = stats.find(
          (st) => st.name?.toLowerCase() === n.toLowerCase() || st.abbreviation?.toLowerCase() === n.toLowerCase()
        );
        if (s && s.value !== undefined && !Number.isNaN(Number(s.value))) {
          return Number(s.value);
        }
      }
      return fallback;
    };

    const getStatDisplay = (names: string[], fallback = '-'): string => {
      for (const n of names) {
        const s = stats.find(
          (st) =>
            st.name?.toLowerCase() === n.toLowerCase() ||
            st.abbreviation?.toLowerCase() === n.toLowerCase() ||
            st.type?.toLowerCase() === n.toLowerCase()
        );
        if (s && s.displayValue) return String(s.displayValue);
      }
      return fallback;
    };

    const wins = getStatVal(['wins', 'w'], 0);
    const losses = getStatVal(['losses', 'l'], 0);
    const ties = getStatVal(['ties', 't'], 0);
    const total = wins + losses + ties;
    const winPct = total > 0 ? (wins + 0.5 * ties) / total : getStatVal(['winPercent', 'pct'], 0);
    const pointsFor = getStatVal(['pointsFor', 'pf'], 0);
    const pointsAgainst = getStatVal(['pointsAgainst', 'pa'], 0);
    const pointDiff = getStatVal(['pointDifferential', 'differential', 'diff'], pointsFor - pointsAgainst);

    const divRecord = getStatDisplay(['vs. Div.', 'Division', 'div'], '0-0');
    const [divW = 0, divL = 0, divT = 0] = divRecord.split('-').map((x) => Number(x) || 0);
    const divTotal = divW + divL + divT;

    const confRecord = getStatDisplay(['vs. Conf.', 'Conference', 'conf'], '0-0');
    const [confW = 0, confL = 0, confT = 0] = confRecord.split('-').map((x) => Number(x) || 0);
    const confTotal = confW + confL + confT;

    const seed = getStatVal(['playoffSeed', 'seed'], 0);

    byTeamId[teamMeta.id] = {
      team: teamMeta,
      wins,
      losses,
      ties,
      winPct,
      pointsFor,
      pointsAgainst,
      pointDiff,
      homeRecord: getStatDisplay(['Home', 'home'], '0-0'),
      awayRecord: getStatDisplay(['Away', 'Road', 'away'], '0-0'),
      divWins: divW,
      divLosses: divL,
      divTies: divT,
      divWinPct: divTotal > 0 ? (divW + 0.5 * divT) / divTotal : 0,
      divRecord,
      confWins: confW,
      confLosses: confL,
      confTies: confT,
      confWinPct: confTotal > 0 ? (confW + 0.5 * confT) / confTotal : 0,
      confRecord,
      streak: getStatDisplay(['streak', 'strk'], '-'),
      sov: 0,
      sos: 0,
      seed: seed > 0 ? seed : undefined,
      clinched: entry.note?.description || undefined,
    };
  }

  // Ensure all 32 teams exist
  for (const team of NFL_TEAMS) {
    if (!byTeamId[team.id]) {
      byTeamId[team.id] = {
        team,
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
      };
    }
  }

  return Object.values(byTeamId);
}

export function normalizeGameSummary(raw: any, eventId: string): GameCenterDetail {
  const headerComp = raw?.header?.competitions?.[0] || {};
  const seasonYear = Number(raw?.header?.season?.year || 2026);
  const seasonType = Number(raw?.header?.season?.type || 2);
  const week = Number(raw?.header?.week || 1);

  const game = normalizeScoreboardEvent(
    {
      id: eventId,
      season: { year: seasonYear, type: seasonType },
      week: { number: week },
      date: headerComp.date,
      competitions: [headerComp],
    },
    seasonYear,
    seasonType,
    week
  );

  // Scoring plays
  const scoringPlays: ScoringPlay[] = (raw?.scoringPlays || []).map((sp: any, idx: number) => {
    const tMeta = getTeamByIdOrAbbr(sp?.team?.id || sp?.team?.abbreviation);
    return {
      id: String(sp.id || idx),
      period: Number(sp?.period?.number || 1),
      clock: sp?.clock?.displayValue || '',
      type: sp?.type?.abbreviation || sp?.scoringType?.abbreviation || 'SCORE',
      text: sp?.text || '',
      awayScore: Number(sp?.awayScore ?? 0),
      homeScore: Number(sp?.homeScore ?? 0),
      teamAbbr: tMeta.abbr,
      teamLogo: tMeta.logo,
    };
  });

  // Team comparison stats
  const boxTeams: any[] = raw?.boxscore?.teams || [];
  const awayBox =
    boxTeams.find((bt) => getTeamByIdOrAbbr(bt?.team?.id || bt?.team?.abbreviation).id === game.awayTeam.id) ||
    boxTeams[0] ||
    {};
  const homeBox =
    boxTeams.find((bt) => getTeamByIdOrAbbr(bt?.team?.id || bt?.team?.abbreviation).id === game.homeTeam.id) ||
    boxTeams[1] ||
    {};

  const statWanted: { key: string; label: string }[] = [
    { key: 'totalYards', label: 'Total Yards' },
    { key: 'netPassingYards', label: 'Passing Yards' },
    { key: 'rushingYards', label: 'Rushing Yards' },
    { key: 'yardsPerPlay', label: 'Yards Per Play' },
    { key: 'firstDowns', label: '1st Downs' },
    { key: 'thirdDownEff', label: '3rd Down Efficiency' },
    { key: 'fourthDownEff', label: '4th Down Efficiency' },
    { key: 'redZoneAttempts', label: 'Red Zone' },
    { key: 'turnovers', label: 'Turnovers' },
    { key: 'totalPenaltiesYards', label: 'Penalties - Yards' },
    { key: 'possessionTime', label: 'Possession Time' },
  ];

  const parseStatNum = (val: string): number => {
    if (!val) return 0;
    if (val.includes(':')) {
      const [m, s] = val.split(':').map(Number);
      return (m || 0) * 60 + (s || 0);
    }
    if (val.includes('-')) {
      const [made, att] = val.split('-').map(Number);
      return att > 0 ? (made / att) * 100 : made || 0;
    }
    return parseFloat(val) || 0;
  };

  const teamStats = statWanted
    .map(({ key, label }) => {
      const aStat = (awayBox.statistics || []).find((s: any) => s.name === key);
      const hStat = (homeBox.statistics || []).find((s: any) => s.name === key);
      if (!aStat && !hStat) return null;
      const awayValue = String(aStat?.displayValue ?? '0');
      const homeValue = String(hStat?.displayValue ?? '0');
      return {
        label: aStat?.label || hStat?.label || label,
        awayValue,
        homeValue,
        awayNumeric: parseStatNum(awayValue),
        homeNumeric: parseStatNum(homeValue),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Player Box Score categories
  const boxPlayers: any[] = raw?.boxscore?.players || [];
  const parsePlayerBox = (teamId: string): BoxScoreCategory[] => {
    const entry = boxPlayers.find(
      (bp) => getTeamByIdOrAbbr(bp?.team?.id || bp?.team?.abbreviation).id === teamId
    );
    if (!entry || !Array.isArray(entry.statistics)) return [];

    return entry.statistics
      .filter((cat: any) => Array.isArray(cat.athletes) && cat.athletes.length > 0)
      .map((cat: any) => ({
        name: cat.text || cat.name || 'Stats',
        labels: cat.labels || [],
        descriptions: cat.descriptions || [],
        athletes: (cat.athletes || []).map((a: any) => ({
          id: String(a?.athlete?.id || ''),
          name: a?.athlete?.displayName || a?.athlete?.shortName || 'Player',
          jersey: a?.athlete?.jersey || '',
          position: a?.athlete?.position?.abbreviation || '',
          headshot: a?.athlete?.headshot?.href,
          stats: (a.stats || []).map(String),
        })),
        totals: (cat.totals || []).map(String),
      }));
  };

  // Drives & Play-by-Play
  const rawDrives: any[] =
    raw?.drives?.previous || (Array.isArray(raw?.drives) ? raw.drives : []);
  const drives: DriveItem[] = rawDrives.map((d: any, idx: number) => {
    const tMeta = getTeamByIdOrAbbr(d?.team?.id || d?.team?.abbreviation);
    return {
      id: String(d.id || idx),
      description: d.description || '',
      teamAbbr: tMeta.abbr,
      teamLogo: tMeta.logo,
      result: d.displayResult || d.result || 'Drive',
      yards: Number(d.yards || 0),
      plays: Number(d.offensivePlays || d.plays?.length || 0),
      timeElapsed: d.timeElapsed?.displayValue || '',
      isScore: Boolean(d.isScore),
      startText: d.start?.text || '',
      endText: d.end?.text || '',
      playList: (d.plays || []).slice(-12).map((p: any, pIdx: number) => ({
        id: String(p.id || pIdx),
        clock: p?.clock?.displayValue || '',
        period: Number(p?.period?.number || 1),
        text: p.text || '',
        downDistance: p?.start?.downDistanceText || '',
        scoringPlay: Boolean(p.scoringPlay),
      })),
    };
  });

  // Win Probability
  const winProbRaw: any[] = raw?.winprobability || [];
  const step = Math.max(1, Math.floor(winProbRaw.length / 80));
  const winProbability = winProbRaw
    .filter((_, i) => i % step === 0 || i === winProbRaw.length - 1)
    .map((wp: any) => ({
      playId: String(wp.playId || ''),
      homeWinPct: Math.round(Number(wp.homeWinPercentage ?? 0.5) * 1000) / 10,
      text: '',
    }));

  const gInfo = raw?.gameInfo || {};
  return {
    game,
    scoringPlays,
    teamStats,
    boxScore: {
      away: parsePlayerBox(game.awayTeam.id),
      home: parsePlayerBox(game.homeTeam.id),
    },
    drives,
    winProbability,
    gameInfo: {
      venue: gInfo?.venue?.fullName || game.venue || 'NFL Stadium',
      cityState: [gInfo?.venue?.address?.city, gInfo?.venue?.address?.state].filter(Boolean).join(', '),
      attendance: gInfo?.attendance ? Number(gInfo.attendance) : undefined,
      weather: gInfo?.weather?.displayValue || undefined,
      officials: (gInfo?.officials || []).map((o: any) => `${o.displayName} (${o.position?.name || 'Official'})`),
    },
  };
}

export function normalizePlayerLeaders(raw: any): PlayerStatLeader[] {
  const leaders: PlayerStatLeader[] = [];
  const categories: any[] = raw?.leaders?.categories || raw?.categories || [];

  const categoryMap: Record<
    string,
    {
      cat: 'passing' | 'rushing' | 'receiving' | 'defense' | 'kicking';
      label: string;
    }
  > = {
    passingYards: { cat: 'passing', label: 'PASS YDS' },
    passingTouchdowns: { cat: 'passing', label: 'PASS TD' },
    quarterbackRating: { cat: 'passing', label: 'RTG' },
    rushingYards: { cat: 'rushing', label: 'RUSH YDS' },
    rushingTouchdowns: { cat: 'rushing', label: 'RUSH TD' },
    receivingYards: { cat: 'receiving', label: 'REC YDS' },
    receptions: { cat: 'receiving', label: 'REC' },
    receivingTouchdowns: { cat: 'receiving', label: 'REC TD' },
    totalTackles: { cat: 'defense', label: 'TACKLES' },
    sacks: { cat: 'defense', label: 'SACKS' },
    interceptions: { cat: 'defense', label: 'INT' },
    totalPoints: { cat: 'kicking', label: 'PTS' },
    fieldGoalsMade: { cat: 'kicking', label: 'FGM' },
  };

  const byAthleteAndCat: Record<string, PlayerStatLeader> = {};

  for (const catObj of categories) {
    const rawName = String(catObj.name || '');
    const mapped = categoryMap[rawName];
    if (!mapped) continue;

    for (const item of catObj.leaders || []) {
      const ath = item.athlete || {};
      const athId = String(ath.id || '');
      if (!athId) continue;

      const tMeta = getTeamByIdOrAbbr(item.team?.id || ath.team?.id || item.team?.abbreviation);
      const key = `${mapped.cat}:${athId}`;
      const val = Number(item.value ?? 0);
      const disp = String(item.displayValue ?? val);

      if (!byAthleteAndCat[key]) {
        byAthleteAndCat[key] = {
          id: athId,
          name: ath.displayName || ath.fullName || 'NFL Player',
          shortName: ath.shortName || ath.displayName || 'Player',
          position: ath.position?.abbreviation || '',
          jersey: ath.jersey || '',
          teamId: tMeta.id,
          teamAbbr: tMeta.abbr,
          teamColor: tMeta.primaryColor,
          teamLogo: tMeta.logo,
          headshot:
            ath.headshot?.href ||
            `https://a.espncdn.com/i/headshots/nfl/players/full/${athId}.png`,
          category: mapped.cat,
          primaryStatLabel: mapped.label,
          primaryStatValue: val,
          primaryStatDisplay: disp,
          stats: {
            [mapped.label]: disp,
          },
        };
      } else {
        byAthleteAndCat[key].stats[mapped.label] = disp;
      }
    }
  }

  leaders.push(...Object.values(byAthleteAndCat));
  return leaders;
}
