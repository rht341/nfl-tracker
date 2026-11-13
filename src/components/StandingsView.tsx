import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Award,
  ChevronRight,
  GitBranch,
  Info,
  Layers,
  Shield,
  Star,
  Trophy,
} from 'lucide-react';
import { Conference, FullDivision, TeamStanding } from '../types/nfl.ts';

interface StandingsViewProps {
  standings: TeamStanding[];
  seasonYear: number;
  favoriteTeamIds: string[];
  onToggleFavorite: (teamId: string, teamAbbr: string) => void;
  onSelectTeam: (teamId: string) => void;
  onOpenPlayoffMachine: () => void;
}

type GroupingMode = 'division' | 'conference' | 'league';
type SortKey =
  | 'seed'
  | 'winPct'
  | 'pointsFor'
  | 'pointsAgainst'
  | 'pointDiff'
  | 'divWinPct'
  | 'confWinPct'
  | 'sov'
  | 'sos';

export const StandingsView: React.FC<StandingsViewProps> = ({
  standings,
  seasonYear,
  favoriteTeamIds,
  onToggleFavorite,
  onSelectTeam,
  onOpenPlayoffMachine,
}) => {
  const [mode, setMode] = useState<GroupingMode>('division');
  const [showBracket, setShowBracket] = useState<boolean>(true);
  const [sortKey, setSortKey] = useState<SortKey>('seed');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'seed' || key === 'pointsAgainst');
    }
  };

  const sortRows = (rows: TeamStanding[]) => {
    return [...rows].sort((a, b) => {
      const vA = a[sortKey] ?? 99;
      const vB = b[sortKey] ?? 99;
      if (vA === vB) return (a.seed ?? 99) - (b.seed ?? 99);
      return sortAsc ? Number(vA) - Number(vB) : Number(vB) - Number(vA);
    });
  };

  const fmtPct = (n: number) => n.toFixed(3).replace(/^0/, '');

  const bracketByConf = useMemo(() => {
    const getTop7 = (conf: Conference) =>
      standings
        .filter((s) => s.team.conference === conf)
        .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
        .slice(0, 7);
    return {
      AFC: getTop7('AFC'),
      NFC: getTop7('NFC'),
    };
  }, [standings]);

  const renderTable = (rows: TeamStanding[], title: string, accentColor: string, isConferenceMode = false) => {
    const sorted = mode === 'division' ? rows : sortRows(rows);

    return (
      <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        <div
          className="px-4 py-3 border-b border-slate-800 flex items-center justify-between"
          style={{
            background: `linear-gradient(90deg, ${accentColor}22 0%, rgba(13,18,29,0.95) 60%)`,
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
              {title}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {rows.length} Teams
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] font-mono uppercase text-slate-400">
                <th className="py-2.5 pl-3 pr-1 w-8"></th>
                <th
                  onClick={() => handleSort('seed')}
                  className="py-2.5 px-2 cursor-pointer hover:text-white"
                >
                  Seed
                </th>
                <th className="py-2.5 px-3 min-w-[180px]">Franchise</th>
                <th className="py-2.5 px-2 text-center">W-L-T</th>
                <th
                  onClick={() => handleSort('winPct')}
                  className="py-2.5 px-2 text-right cursor-pointer hover:text-white"
                >
                  PCT
                </th>
                <th
                  onClick={() => handleSort('pointsFor')}
                  className="py-2.5 px-2 text-right cursor-pointer hover:text-white"
                >
                  PF
                </th>
                <th
                  onClick={() => handleSort('pointsAgainst')}
                  className="py-2.5 px-2 text-right cursor-pointer hover:text-white"
                >
                  PA
                </th>
                <th
                  onClick={() => handleSort('pointDiff')}
                  className="py-2.5 px-2 text-right cursor-pointer hover:text-white"
                >
                  DIFF
                </th>
                <th className="py-2.5 px-2 text-center hidden md:table-cell">HOME</th>
                <th className="py-2.5 px-2 text-center hidden md:table-cell">AWAY</th>
                <th
                  onClick={() => handleSort('divWinPct')}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-white"
                >
                  DIV
                </th>
                <th
                  onClick={() => handleSort('confWinPct')}
                  className="py-2.5 px-2 text-center cursor-pointer hover:text-white"
                >
                  CONF
                </th>
                <th
                  onClick={() => handleSort('sov')}
                  className="py-2.5 px-2 text-right cursor-pointer hover:text-white hidden xl:table-cell"
                  title="Strength of Victory (Combined Win% of Defeated Opponents)"
                >
                  SOV
                </th>
                <th
                  onClick={() => handleSort('sos')}
                  className="py-2.5 px-2 text-right cursor-pointer hover:text-white hidden xl:table-cell"
                  title="Strength of Schedule (Combined Win% of All Opponents)"
                >
                  SOS
                </th>
                <th className="py-2.5 px-2 text-center">STRK</th>
                <th className="py-2.5 px-3 text-right hidden lg:table-cell">LAST 5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {sorted.map((row, idx) => {
                const isFav = favoriteTeamIds.includes(row.team.id);
                const seed = row.seed ?? 99;
                const isPlayoffTeam = seed <= 7;
                const isCutlineAfter = isConferenceMode && sortKey === 'seed' && sortAsc && seed === 7;
                const isDivLeaderCutlineAfter =
                  isConferenceMode && sortKey === 'seed' && sortAsc && seed === 4;

                return (
                  <React.Fragment key={row.team.id}>
                    <tr
                      className={`group transition-colors ${
                        isFav
                          ? 'bg-amber-500/10 hover:bg-amber-500/15'
                          : isPlayoffTeam
                          ? 'hover:bg-slate-800/60 bg-emerald-950/10'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Favorite Star */}
                      <td className="py-2.5 pl-3 pr-1">
                        <button
                          onClick={() => onToggleFavorite(row.team.id, row.team.abbr)}
                          className="p-1 rounded hover:bg-slate-800 cursor-pointer"
                          title={isFav ? 'Remove from Spotlight' : 'Pin to Spotlight'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-slate-400'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Playoff Seed */}
                      <td className="py-2.5 px-2 font-mono">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-5 rounded text-[11px] font-bold ${
                            seed === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : seed <= 4
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : seed <= 7
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}
                        >
                          #{seed}
                        </span>
                      </td>

                      {/* Franchise Name + Tiebreaker Explanation Tooltip */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => onSelectTeam(row.team.id)}
                            className="flex items-center gap-2.5 text-left cursor-pointer group/team"
                          >
                            <img
                              src={row.team.logo}
                              alt={row.team.abbr}
                              className="w-6 h-6 object-contain shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-100 group-hover/team:text-emerald-300 transition">
                                  {row.team.displayName}
                                </span>
                                {row.clinched && (
                                  <span
                                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    title={row.clinched}
                                  >
                                    {row.clinched}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {row.team.fullDivision} • Div #{row.divisionRank}
                              </div>
                            </div>
                          </button>

                          {row.tiebreakerExplanation && (
                            <div className="relative group/tb shrink-0">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono cursor-help">
                                <Info className="w-3 h-3" />
                                <span>TB</span>
                              </span>
                              <div className="invisible group-hover/tb:visible opacity-0 group-hover/tb:opacity-100 transition-opacity absolute right-0 bottom-full mb-1.5 w-64 p-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 shadow-2xl text-[11px] text-slate-200 z-30 pointer-events-none">
                                <div className="font-bold text-indigo-300 mb-0.5">
                                  NFL Tiebreaker Applied
                                </div>
                                <div>{row.tiebreakerExplanation}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* W-L-T */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-white">
                        {row.wins}-{row.losses}
                        {row.ties > 0 ? `-${row.ties}` : ''}
                      </td>

                      {/* Win PCT */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-200">
                        {fmtPct(row.winPct)}
                      </td>

                      {/* PF / PA / DIFF */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                        {row.pointsFor}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                        {row.pointsAgainst}
                      </td>
                      <td
                        className={`py-2.5 px-2 text-right font-mono font-bold ${
                          row.pointDiff > 0
                            ? 'text-emerald-400'
                            : row.pointDiff < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                      </td>

                      {/* Home / Away / Div / Conf */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400 hidden md:table-cell">
                        {row.homeRecord}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400 hidden md:table-cell">
                        {row.awayRecord}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {row.divRecord}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {row.confRecord}
                      </td>

                      {/* SOV / SOS */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400 hidden xl:table-cell">
                        {fmtPct(row.sov)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400 hidden xl:table-cell">
                        {fmtPct(row.sos)}
                      </td>

                      {/* Streak */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.streak.startsWith('W')
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : row.streak.startsWith('L')
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {row.streak}
                        </span>
                      </td>

                      {/* Last 5 */}
                      <td className="py-2.5 px-3 text-right hidden lg:table-cell">
                        <div className="inline-flex items-center gap-1">
                          {(row.last5 || []).map((res, rIdx) => (
                            <span
                              key={rIdx}
                              className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold ${
                                res === 'W'
                                  ? 'bg-emerald-500/25 text-emerald-300'
                                  : res === 'L'
                                  ? 'bg-rose-500/25 text-rose-300'
                                  : 'bg-amber-500/25 text-amber-300'
                              }`}
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>

                    {/* Division Leaders Cutline (#4) */}
                    {isDivLeaderCutlineAfter && idx < sorted.length - 1 && (
                      <tr className="bg-emerald-950/30 border-y border-emerald-500/30">
                        <td
                          colSpan={16}
                          className="py-1 px-4 text-[10px] font-mono uppercase tracking-widest text-emerald-300"
                        >
                          ▲ Division Leaders (Seeds 1–4 Host Wild Card Round) • ▼ Wild Card Contenders (Seeds 5–7 Qualify)
                        </td>
                      </tr>
                    )}

                    {/* Playoff Cutline (#7) */}
                    {isCutlineAfter && idx < sorted.length - 1 && (
                      <tr className="bg-rose-950/30 border-y border-rose-500/40">
                        <td
                          colSpan={16}
                          className="py-1 px-4 text-[10px] font-mono uppercase tracking-widest text-rose-300"
                        >
                          ▲ Projected Playoff Cutline (Top 7 Seeds Advance) • ▼ In The Hunt (Seeds 8–16)
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const divisionsByConf: Record<Conference, FullDivision[]> = {
    AFC: ['AFC East', 'AFC North', 'AFC South', 'AFC West'],
    NFC: ['NFC East', 'NFC North', 'NFC South', 'NFC West'],
  };

  return (
    <div className="space-y-6">
      {/* Top Action & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d121d] p-4 rounded-2xl border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {seasonYear} NFL Standings & Playoff Seeding
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Live NFL tiebreaker engine (Head-to-Head, Division %, Conference %, Common Games, SOV, SOS). Hover{' '}
            <span className="font-mono text-indigo-300 px-1 py-0.2 bg-indigo-500/15 rounded">TB</span> badges for tiebreaker breakdowns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Grouping Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: 'division', label: 'By Division' },
                { id: 'conference', label: 'Playoff Picture (Conf)' },
                { id: 'league', label: 'Full League (1-32)' },
              ] as { id: GroupingMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  mode === m.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowBracket(!showBracket)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              showBracket
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{showBracket ? 'Hide Bracket' : 'Show Playoff Bracket'}</span>
          </button>

          <button
            onClick={onOpenPlayoffMachine}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-950/50 hover:brightness-110 transition cursor-pointer"
          >
            <span>Simulate Scenarios</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Projected Playoff Bracket Panel */}
      {showBracket && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(['AFC', 'NFC'] as Conference[]).map((conf) => {
            const top7 = bracketByConf[conf];
            const seed1 = top7[0];
            const matchups = [
              { high: top7[1], low: top7[6], label: '#2 vs #7 Wild Card' },
              { high: top7[2], low: top7[5], label: '#3 vs #6 Wild Card' },
              { high: top7[3], low: top7[4], label: '#4 vs #5 Wild Card' },
            ];
            const isAFC = conf === 'AFC';

            return (
              <div
                key={conf}
                className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Award className={`w-4 h-4 ${isAFC ? 'text-rose-400' : 'text-blue-400'}`} />
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {conf} Projected Playoff Bracket
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    If Season Ended Today
                  </span>
                </div>

                {/* #1 Seed First-Round Bye */}
                {seed1 && (
                  <div
                    onClick={() => onSelectTeam(seed1.team.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-xs">
                        #1 BYE
                      </span>
                      <img src={seed1.team.logo} alt={seed1.team.abbr} className="w-6 h-6 object-contain" />
                      <div>
                        <div className="text-xs font-bold text-white">{seed1.team.displayName}</div>
                        <div className="text-[10px] font-mono text-amber-300/90">
                          {seed1.team.fullDivision} Leader • Homefield Advantage
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-white">
                        {seed1.wins}-{seed1.losses}
                        {seed1.ties > 0 ? `-${seed1.ties}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Diff {seed1.pointDiff >= 0 ? `+${seed1.pointDiff}` : seed1.pointDiff}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wild Card Matchups (#2v#7, #3v#6, #4v#5) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {matchups.map((m, idx) => {
                    if (!m.high || !m.low) return null;
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                      >
                        <div className="text-[10px] font-mono uppercase text-slate-400">
                          {m.label}
                        </div>
                        {[m.low, m.high].map((seedTeam, sIdx) => (
                          <button
                            key={seedTeam.team.id}
                            onClick={() => onSelectTeam(seedTeam.team.id)}
                            className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-800 transition text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-emerald-400 font-bold w-4">
                                #{seedTeam.seed}
                              </span>
                              <img
                                src={seedTeam.team.logo}
                                alt={seedTeam.team.abbr}
                                className="w-4 h-4 object-contain"
                              />
                              <span className="text-xs font-bold text-white">
                                {seedTeam.team.abbr}
                              </span>
                              {sIdx === 1 && (
                                <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-slate-400">
                                  HOST
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-300">
                              {seedTeam.wins}-{seedTeam.losses}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Standings Tables by Mode */}
      {mode === 'division' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {(['AFC', 'NFC'] as Conference[]).map((conf) => (
            <div key={conf} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Layers className={`w-4 h-4 ${conf === 'AFC' ? 'text-rose-400' : 'text-blue-400'}`} />
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  {conf === 'AFC' ? 'American Football Conference (AFC)' : 'National Football Conference (NFC)'}
                </h2>
              </div>
              {divisionsByConf[conf].map((div) => {
                const divRows = standings
                  .filter((s) => s.team.fullDivision === div)
                  .sort((a, b) => (a.divisionRank ?? 99) - (b.divisionRank ?? 99));
                return (
                  <div key={div}>
                    {renderTable(
                      divRows,
                      div,
                      conf === 'AFC' ? '#e11d48' : '#2563eb',
                      false
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {mode === 'conference' && (
        <div className="grid grid-cols-1 gap-6">
          {(['AFC', 'NFC'] as Conference[]).map((conf) => {
            const confRows = standings.filter((s) => s.team.conference === conf);
            return (
              <div key={conf}>
                {renderTable(
                  confRows,
                  `${conf} Conference Playoff Standings (Seeds 1–16)`,
                  conf === 'AFC' ? '#e11d48' : '#2563eb',
                  true
                )}
              </div>
            );
          })}
        </div>
      )}

      {mode === 'league' && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click any column header (PCT, PF, PA, DIFF, DIV, CONF, SOV, SOS) to sort all 32 teams.</span>
          </div>
          {renderTable(standings, `NFL Full League Standings (All 32 Franchises)`, '#10b981', false)}
        </div>
      )}
    </div>
  );
};
