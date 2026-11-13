import type { Conference, FullDivision, NFLTeamStatic, SeasonGame, TeamStanding } from '../types/nfl.ts';
import { NFL_TEAMS } from './nflTeams.ts';

interface H2HRecord {
  wins: number;
  losses: number;
  ties: number;
}

interface InternalTeamRecord {
  team: NFLTeamStatic;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  homeW: number;
  homeL: number;
  homeT: number;
  awayW: number;
  awayL: number;
  awayT: number;
  divW: number;
  divL: number;
  divT: number;
  confW: number;
  confL: number;
  confT: number;
  resultsChronological: ('W' | 'L' | 'T')[];
  h2h: Record<string, H2HRecord>; // opponentId -> record vs opponent
  opponentsPlayed: string[]; // list of opponent IDs (with multiplicity)
  opponentsDefeated: string[]; // list of defeated opponent IDs (with multiplicity)
}

function calcWinPct(w: number, l: number, t: number): number {
  const total = w + l + t;
  if (total === 0) return 0;
  return (w + 0.5 * t) / total;
}

function fmtPct(pct: number): string {
  return pct.toFixed(3).replace(/^0/, '');
}

/**
 * Computes full NFL standings, SOV, SOS, division ranks, conference seeds (1-16),
 * and human-readable tiebreaker explanations from a season schedule and optional user picks.
 */
export function computeStandingsFromGames(
  games: SeasonGame[],
  picks: Record<string, 'home' | 'away' | 'tie'> = {},
  baselineStandings?: TeamStanding[]
): TeamStanding[] {
  // Filter to regular season games (seasonType === 2)
  const regGames = games.filter((g) => g.seasonType === 2);

  // If we have zero regular season games at all and baselineStandings are provided, sort & seed baseline
  if (regGames.length === 0 && baselineStandings && baselineStandings.length > 0) {
    return seedBaselineStandings(baselineStandings);
  }

  const records: Record<string, InternalTeamRecord> = {};
  for (const team of NFL_TEAMS) {
    records[team.id] = {
      team,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      homeW: 0,
      homeL: 0,
      homeT: 0,
      awayW: 0,
      awayL: 0,
      awayT: 0,
      divW: 0,
      divL: 0,
      divT: 0,
      confW: 0,
      confL: 0,
      confT: 0,
      resultsChronological: [],
      h2h: {},
      opponentsPlayed: [],
      opponentsDefeated: [],
    };
  }

  // Sort games chronologically by week then date
  const sortedGames = [...regGames].sort((a, b) => a.week - b.week || a.date.localeCompare(b.date));

  for (const g of sortedGames) {
    const home = records[g.homeTeam.id];
    const away = records[g.awayTeam.id];
    if (!home || !away) continue;

    const userPick = picks[g.id];
    let outcome: 'home' | 'away' | 'tie' | null = null;
    let homeScore = g.homeTeam.score;
    let awayScore = g.awayTeam.score;

    if (userPick) {
      outcome = userPick;
      if (g.statusState !== 'post') {
        // Synthetic realistic score for simulated unplayed games
        if (userPick === 'home') {
          homeScore = 24;
          awayScore = 20;
        } else if (userPick === 'away') {
          homeScore = 20;
          awayScore = 24;
        } else {
          homeScore = 20;
          awayScore = 20;
        }
      }
    } else if (g.statusState === 'post') {
      if (homeScore > awayScore) outcome = 'home';
      else if (awayScore > homeScore) outcome = 'away';
      else outcome = 'tie';
    }

    if (!outcome) continue;

    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;

    home.opponentsPlayed.push(away.team.id);
    away.opponentsPlayed.push(home.team.id);

    if (!home.h2h[away.team.id]) home.h2h[away.team.id] = { wins: 0, losses: 0, ties: 0 };
    if (!away.h2h[home.team.id]) away.h2h[home.team.id] = { wins: 0, losses: 0, ties: 0 };

    const sameConf = home.team.conference === away.team.conference;
    const sameDiv = home.team.fullDivision === away.team.fullDivision;

    if (outcome === 'home') {
      home.wins++;
      home.homeW++;
      home.resultsChronological.push('W');
      home.h2h[away.team.id].wins++;
      home.opponentsDefeated.push(away.team.id);

      away.losses++;
      away.awayL++;
      away.resultsChronological.push('L');
      away.h2h[home.team.id].losses++;

      if (sameConf) {
        home.confW++;
        away.confL++;
      }
      if (sameDiv) {
        home.divW++;
        away.divL++;
      }
    } else if (outcome === 'away') {
      away.wins++;
      away.awayW++;
      away.resultsChronological.push('W');
      away.h2h[home.team.id].wins++;
      away.opponentsDefeated.push(home.team.id);

      home.losses++;
      home.homeL++;
      home.resultsChronological.push('L');
      home.h2h[away.team.id].losses++;

      if (sameConf) {
        away.confW++;
        home.confL++;
      }
      if (sameDiv) {
        away.divW++;
        home.divL++;
      }
    } else {
      home.ties++;
      home.homeT++;
      home.resultsChronological.push('T');
      home.h2h[away.team.id].ties++;

      away.ties++;
      away.awayT++;
      away.resultsChronological.push('T');
      away.h2h[home.team.id].ties++;

      if (sameConf) {
        home.confT++;
        away.confT++;
      }
      if (sameDiv) {
        home.divT++;
        away.divT++;
      }
    }
  }

  // Compute SOV and SOS for all 32 teams
  const standingsMap: Record<string, TeamStanding> = {};

  for (const team of NFL_TEAMS) {
    const r = records[team.id];
    const winPct = calcWinPct(r.wins, r.losses, r.ties);
    const divWinPct = calcWinPct(r.divW, r.divL, r.divT);
    const confWinPct = calcWinPct(r.confW, r.confL, r.confT);

    // SOV: combined W-L-T of defeated opponents
    let sovW = 0,
      sovL = 0,
      sovT = 0;
    for (const oppId of r.opponentsDefeated) {
      const opp = records[oppId];
      if (opp) {
        sovW += opp.wins;
        sovL += opp.losses;
        sovT += opp.ties;
      }
    }
    const sov = calcWinPct(sovW, sovL, sovT);

    // SOS: combined W-L-T of all played opponents
    let sosW = 0,
      sosL = 0,
      sosT = 0;
    for (const oppId of r.opponentsPlayed) {
      const opp = records[oppId];
      if (opp) {
        sosW += opp.wins;
        sosL += opp.losses;
        sosT += opp.ties;
      }
    }
    const sos = calcWinPct(sosW, sosL, sosT);

    // Compute streak
    let streak = '-';
    if (r.resultsChronological.length > 0) {
      const last = r.resultsChronological[r.resultsChronological.length - 1];
      let count = 0;
      for (let i = r.resultsChronological.length - 1; i >= 0; i--) {
        if (r.resultsChronological[i] === last) count++;
        else break;
      }
      streak = `${last}${count}`;
    }

    const fmtRec = (w: number, l: number, t: number) => (t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`);

    standingsMap[team.id] = {
      team,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      winPct,
      pointsFor: r.pointsFor,
      pointsAgainst: r.pointsAgainst,
      pointDiff: r.pointsFor - r.pointsAgainst,
      homeRecord: fmtRec(r.homeW, r.homeL, r.homeT),
      awayRecord: fmtRec(r.awayW, r.awayL, r.awayT),
      divWins: r.divW,
      divLosses: r.divL,
      divTies: r.divT,
      divWinPct,
      divRecord: fmtRec(r.divW, r.divL, r.divT),
      confWins: r.confW,
      confLosses: r.confL,
      confTies: r.confT,
      confWinPct,
      confRecord: fmtRec(r.confW, r.confL, r.confT),
      streak,
      sov,
      sos,
      last5: r.resultsChronological.slice(-5),
    };
  }

  // Helper: Head-to-head win% among a specific set of tied teams
  function getGroupH2H(teamId: string, opponentIds: string[]): { pct: number; games: number } {
    const r = records[teamId];
    let w = 0,
      l = 0,
      t = 0;
    for (const oppId of opponentIds) {
      if (oppId === teamId) continue;
      const vs = r.h2h[oppId];
      if (vs) {
        w += vs.wins;
        l += vs.losses;
        t += vs.ties;
      }
    }
    return { pct: calcWinPct(w, l, t), games: w + l + t };
  }

  // Helper: Check if a team swept or was swept by all other tied teams (for 3+ Wild Card H2H)
  function checkMultiTeamSweep(tiedIds: string[]): {
    sweeperId?: string;
    sweptId?: string;
  } {
    for (const candidateId of tiedIds) {
      const r = records[candidateId];
      let beatAll = true;
      let lostToAll = true;
      for (const otherId of tiedIds) {
        if (otherId === candidateId) continue;
        const vs = r.h2h[otherId];
        const total = vs ? vs.wins + vs.losses + vs.ties : 0;
        if (total === 0) {
          beatAll = false;
          lostToAll = false;
          break;
        }
        if (!vs || vs.wins === 0 || vs.losses > 0 || vs.ties > 0) beatAll = false;
        if (!vs || vs.losses === 0 || vs.wins > 0 || vs.ties > 0) lostToAll = false;
      }
      if (beatAll) return { sweeperId: candidateId };
      if (lostToAll) return { sweptId: candidateId };
    }
    return {};
  }

  // Helper: Common games win% among a set of tied teams (min 4 games required by NFL rules)
  function getCommonGamesPct(tiedIds: string[]): Record<string, number> | null {
    const oppSets = tiedIds.map((id) => new Set(records[id].opponentsPlayed.filter((o) => !tiedIds.includes(o))));
    if (oppSets.length === 0) return null;
    const commonOpps = [...oppSets[0]].filter((oppId) => oppSets.every((s) => s.has(oppId)));
    if (commonOpps.length === 0) return null;

    const result: Record<string, number> = {};
    for (const id of tiedIds) {
      const r = records[id];
      let w = 0,
        l = 0,
        t = 0;
      for (const oppId of commonOpps) {
        const vs = r.h2h[oppId];
        if (vs) {
          w += vs.wins;
          l += vs.losses;
          t += vs.ties;
        }
      }
      if (w + l + t < 4) return null; // NFL requires minimum 4 common games
      result[id] = calcWinPct(w, l, t);
    }
    return result;
  }

  // Step-by-step resolver for picking the single best team from a tied group
  function selectBestTeam(
    candidates: TeamStanding[],
    mode: 'division' | 'wildcard'
  ): { winner: TeamStanding; explanation?: string } {
    if (candidates.length === 1) return { winner: candidates[0] };

    // Sort by overall winPct first
    const maxWinPct = Math.max(...candidates.map((c) => c.winPct));
    let tied = candidates.filter((c) => Math.abs(c.winPct - maxWinPct) < 1e-6);
    if (tied.length === 1) return { winner: tied[0] };

    // If wildcard tie has multiple teams from the SAME division, reduce to the highest division-ranked team per division first
    if (mode === 'wildcard') {
      const byDiv: Record<string, TeamStanding[]> = {};
      for (const t of tied) {
        const div = t.team.fullDivision;
        if (!byDiv[div]) byDiv[div] = [];
        byDiv[div].push(t);
      }
      const hadSameDivCollision = Object.values(byDiv).some((arr) => arr.length > 1);
      if (hadSameDivCollision) {
        tied = Object.values(byDiv).map((arr) => {
          arr.sort((a, b) => (a.divisionRank ?? 99) - (b.divisionRank ?? 99));
          return arr[0];
        });
        if (tied.length === 1) {
          return {
            winner: tied[0],
            explanation: `Won division tiebreaker elimination over division rival`,
          };
        }
      }
    }

    const tiedIds = tied.map((t) => t.team.id);
    const otherAbbrs = (winnerId: string) =>
      tied
        .filter((t) => t.team.id !== winnerId)
        .map((t) => t.team.abbr)
        .join('/');

    // 1. Head-to-Head
    if (mode === 'division' || tied.length === 2) {
      // Check if all tied teams have played at least once among the group (for 2 teams, must have played each other)
      const h2hStats = tied.map((t) => ({
        team: t,
        ...getGroupH2H(t.team.id, tiedIds),
      }));
      const canUseH2H =
        tied.length === 2
          ? h2hStats[0].games > 0
          : h2hStats.every((s) => s.games > 0);

      if (canUseH2H) {
        const bestH2H = Math.max(...h2hStats.map((s) => s.pct));
        const minH2H = Math.min(...h2hStats.map((s) => s.pct));
        if (bestH2H > minH2H + 1e-6) {
          const remaining = h2hStats.filter((s) => Math.abs(s.pct - bestH2H) < 1e-6).map((s) => s.team);
          if (remaining.length === 1) {
            const w = remaining[0];
            return {
              winner: w,
              explanation: `Head-to-Head win% (${fmtPct(bestH2H)}) vs ${otherAbbrs(w.team.id)}`,
            };
          }
          const sub = selectBestTeam(remaining, mode);
          return {
            winner: sub.winner,
            explanation: sub.explanation || `Head-to-Head tiebreaker vs ${otherAbbrs(sub.winner.team.id)}`,
          };
        }
      }
    } else {
      // 3+ teams Wild Card H2H Sweep check
      const sweep = checkMultiTeamSweep(tiedIds);
      if (sweep.sweeperId) {
        const w = tied.find((t) => t.team.id === sweep.sweeperId)!;
        return {
          winner: w,
          explanation: `Head-to-Head sweep over ${otherAbbrs(w.team.id)}`,
        };
      }
      if (sweep.sweptId && tied.length > 2) {
        const remaining = tied.filter((t) => t.team.id !== sweep.sweptId);
        return selectBestTeam(remaining, mode);
      }
    }

    // 2. Division Win% (only for Division ties)
    if (mode === 'division') {
      const bestDiv = Math.max(...tied.map((t) => t.divWinPct));
      const minDiv = Math.min(...tied.map((t) => t.divWinPct));
      if (bestDiv > minDiv + 1e-6) {
        const remaining = tied.filter((t) => Math.abs(t.divWinPct - bestDiv) < 1e-6);
        if (remaining.length === 1) {
          const w = remaining[0];
          return {
            winner: w,
            explanation: `Division record (${w.divRecord}, ${fmtPct(w.divWinPct)}) over ${otherAbbrs(w.team.id)}`,
          };
        }
        return selectBestTeam(remaining, mode);
      }
    }

    // 3. For Wild Card: Conference Win% comes before Common Games
    if (mode === 'wildcard') {
      const bestConf = Math.max(...tied.map((t) => t.confWinPct));
      const minConf = Math.min(...tied.map((t) => t.confWinPct));
      if (bestConf > minConf + 1e-6) {
        const remaining = tied.filter((t) => Math.abs(t.confWinPct - bestConf) < 1e-6);
        if (remaining.length === 1) {
          const w = remaining[0];
          return {
            winner: w,
            explanation: `Conference record (${w.confRecord}, ${fmtPct(w.confWinPct)}) over ${otherAbbrs(w.team.id)}`,
          };
        }
        return selectBestTeam(remaining, mode);
      }
    }

    // 4. Common Games Win% (min 4 games)
    const commonPcts = getCommonGamesPct(tiedIds);
    if (commonPcts) {
      const vals = tied.map((t) => commonPcts[t.team.id]);
      const bestCommon = Math.max(...vals);
      const minCommon = Math.min(...vals);
      if (bestCommon > minCommon + 1e-6) {
        const remaining = tied.filter((t) => Math.abs(commonPcts[t.team.id] - bestCommon) < 1e-6);
        if (remaining.length === 1) {
          const w = remaining[0];
          return {
            winner: w,
            explanation: `Common games win% (${fmtPct(bestCommon)}) over ${otherAbbrs(w.team.id)}`,
          };
        }
        return selectBestTeam(remaining, mode);
      }
    }

    // 5. For Division: Conference Win% comes after Common Games
    if (mode === 'division') {
      const bestConf = Math.max(...tied.map((t) => t.confWinPct));
      const minConf = Math.min(...tied.map((t) => t.confWinPct));
      if (bestConf > minConf + 1e-6) {
        const remaining = tied.filter((t) => Math.abs(t.confWinPct - bestConf) < 1e-6);
        if (remaining.length === 1) {
          const w = remaining[0];
          return {
            winner: w,
            explanation: `Conference record (${w.confRecord}, ${fmtPct(w.confWinPct)}) over ${otherAbbrs(w.team.id)}`,
          };
        }
        return selectBestTeam(remaining, mode);
      }
    }

    // 6. Strength of Victory (SOV)
    const bestSov = Math.max(...tied.map((t) => t.sov));
    const minSov = Math.min(...tied.map((t) => t.sov));
    if (bestSov > minSov + 1e-6) {
      const remaining = tied.filter((t) => Math.abs(t.sov - bestSov) < 1e-6);
      if (remaining.length === 1) {
        const w = remaining[0];
        return {
          winner: w,
          explanation: `Strength of Victory (${fmtPct(w.sov)}) over ${otherAbbrs(w.team.id)}`,
        };
      }
      return selectBestTeam(remaining, mode);
    }

    // 7. Strength of Schedule (SOS)
    const bestSos = Math.max(...tied.map((t) => t.sos));
    const minSos = Math.min(...tied.map((t) => t.sos));
    if (bestSos > minSos + 1e-6) {
      const remaining = tied.filter((t) => Math.abs(t.sos - bestSos) < 1e-6);
      if (remaining.length === 1) {
        const w = remaining[0];
        return {
          winner: w,
          explanation: `Strength of Schedule (${fmtPct(w.sos)}) over ${otherAbbrs(w.team.id)}`,
        };
      }
      return selectBestTeam(remaining, mode);
    }

    // 8. Point Differential
    const bestDiff = Math.max(...tied.map((t) => t.pointDiff));
    const minDiff = Math.min(...tied.map((t) => t.pointDiff));
    if (bestDiff > minDiff) {
      const w = tied.find((t) => t.pointDiff === bestDiff)!;
      return {
        winner: w,
        explanation: `Net Point Differential (${w.pointDiff >= 0 ? '+' : ''}${w.pointDiff}) over ${otherAbbrs(w.team.id)}`,
      };
    }

    return { winner: tied[0] };
  }

  function rankGroup(group: TeamStanding[], mode: 'division' | 'wildcard'): TeamStanding[] {
    const remaining = [...group];
    const ordered: TeamStanding[] = [];
    while (remaining.length > 0) {
      const { winner, explanation } = selectBestTeam(remaining, mode);
      if (explanation && (!winner.tiebreakerExplanation || mode === 'wildcard')) {
        winner.tiebreakerExplanation = explanation;
      }
      ordered.push(winner);
      const idx = remaining.findIndex((t) => t.team.id === winner.team.id);
      remaining.splice(idx, 1);
    }
    return ordered;
  }

  // Step A: Rank each of the 8 divisions (1..4)
  const divisions: FullDivision[] = [
    'AFC East',
    'AFC North',
    'AFC South',
    'AFC West',
    'NFC East',
    'NFC North',
    'NFC South',
    'NFC West',
  ];

  const allStandings = Object.values(standingsMap);

  for (const div of divisions) {
    const divTeams = allStandings.filter((s) => s.team.fullDivision === div);
    const rankedDiv = rankGroup(divTeams, 'division');
    rankedDiv.forEach((teamStanding, idx) => {
      teamStanding.divisionRank = idx + 1;
    });
  }

  // Step B: Rank each Conference (Seeds 1..4 = Division Winners, Seeds 5..16 = Wild Card pool)
  const conferences: Conference[] = ['AFC', 'NFC'];
  for (const conf of conferences) {
    const confTeams = allStandings.filter((s) => s.team.conference === conf);
    const divWinners = confTeams.filter((s) => s.divisionRank === 1);
    const wildCardPool = confTeams.filter((s) => (s.divisionRank ?? 99) > 1);

    const rankedWinners = rankGroup(divWinners, 'wildcard');
    const rankedWildCards = rankGroup(wildCardPool, 'wildcard');

    rankedWinners.forEach((t, idx) => {
      t.seed = idx + 1;
    });
    rankedWildCards.forEach((t, idx) => {
      t.seed = idx + 5;
    });
  }

  return allStandings.sort((a, b) => {
    if (a.team.conference !== b.team.conference) {
      return a.team.conference.localeCompare(b.team.conference);
    }
    return (a.seed ?? 99) - (b.seed ?? 99);
  });
}

function seedBaselineStandings(standings: TeamStanding[]): TeamStanding[] {
  const copy = standings.map((s) => ({ ...s }));
  for (const conf of ['AFC', 'NFC'] as Conference[]) {
    const confTeams = copy
      .filter((s) => s.team.conference === conf)
      .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99) || b.winPct - a.winPct || b.pointDiff - a.pointDiff);
    confTeams.forEach((t, i) => {
      if (!t.seed) t.seed = i + 1;
    });
  }
  return copy;
}
