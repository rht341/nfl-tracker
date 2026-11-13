import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  Crosshair,
  GitCompare,
  Search,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import {
  PlayerStatLeader,
  TeamSeasonStatRow,
  WatchlistPlayer,
} from '../types/nfl.ts';

interface StatsViewProps {
  seasonYear: number;
  teamStats: TeamSeasonStatRow[];
  playerLeaders: PlayerStatLeader[];
  watchlist: WatchlistPlayer[];
  favoriteTeamIds: string[];
  onAddWatchlist: (player: Omit<WatchlistPlayer, 'createdAt'>) => Promise<void>;
  onRemoveWatchlist: (athleteId: string) => Promise<void>;
  onSelectTeam: (teamId: string) => void;
}

type StatsSubTab = 'teams' | 'players' | 'compare' | 'watchlist';
type TeamSortCol =
  | 'ppg'
  | 'papg'
  | 'pointDiffPerGame'
  | 'totalYpg'
  | 'passYpg'
  | 'rushYpg'
  | 'defTotalYpg'
  | 'thirdDownPct'
  | 'redZonePct'
  | 'turnoverDiff'
  | 'sacks';

export const StatsView: React.FC<StatsViewProps> = ({
  seasonYear,
  teamStats,
  playerLeaders,
  watchlist,
  favoriteTeamIds,
  onAddWatchlist,
  onRemoveWatchlist,
  onSelectTeam,
}) => {
  const [subTab, setSubTab] = useState<StatsSubTab>('teams');
  const [teamSortCol, setTeamSortCol] = useState<TeamSortCol>('ppg');
  const [teamSortAsc, setTeamSortAsc] = useState<boolean>(false);
  const [quadrantMetric, setQuadrantMetric] = useState<'points' | 'yards'>('points');
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

  // Player Leaderboard filters
  const [playerCategory, setPlayerCategory] = useState<
    'passing' | 'rushing' | 'receiving' | 'defense' | 'kicking'
  >('passing');
  const [playerSearch, setPlayerSearch] = useState('');

  // Head-to-Head Comparator selections
  const [compareTeamA, setCompareTeamA] = useState<string>('12'); // KC default
  const [compareTeamB, setCompareTeamB] = useState<string>('8'); // DET default

  const handleTeamSort = (col: TeamSortCol) => {
    if (teamSortCol === col) {
      setTeamSortAsc(!teamSortAsc);
    } else {
      setTeamSortCol(col);
      // For defensive allowed stats (papg, defTotalYpg), lower is better so default ascending
      setTeamSortAsc(col === 'papg' || col === 'defTotalYpg');
    }
  };

  const sortedTeams = useMemo(() => {
    return [...teamStats].sort((a, b) => {
      const vA = a[teamSortCol];
      const vB = b[teamSortCol];
      return teamSortAsc ? vA - vB : vB - vA;
    });
  }, [teamStats, teamSortCol, teamSortAsc]);

  // Quadrant Chart bounds & averages
  const quadrantData = useMemo(() => {
    if (teamStats.length === 0) return null;
    const xVals = teamStats.map((t) =>
      quadrantMetric === 'points' ? t.ppg : t.totalYpg
    );
    const yVals = teamStats.map((t) =>
      quadrantMetric === 'points' ? t.papg : t.defTotalYpg
    );

    const minX = Math.min(...xVals) * 0.92;
    const maxX = Math.max(...xVals) * 1.06 || 35;
    const minY = Math.min(...yVals) * 0.92;
    const maxY = Math.max(...yVals) * 1.06 || 35;

    const avgX = xVals.reduce((s, v) => s + v, 0) / xVals.length;
    const avgY = yVals.reduce((s, v) => s + v, 0) / yVals.length;

    return { minX, maxX, minY, maxY, avgX, avgY };
  }, [teamStats, quadrantMetric]);

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    return playerLeaders
      .filter((p) => p.category === playerCategory)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.teamAbbr.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q)
      )
      .sort((a, b) => b.primaryStatValue - a.primaryStatValue);
  }, [playerLeaders, playerCategory, playerSearch]);

  const watchlistIds = useMemo(
    () => new Set(watchlist.map((w) => w.athleteId)),
    [watchlist]
  );

  const teamAObj = teamStats.find((t) => t.team.id === compareTeamA) || teamStats[0];
  const teamBObj = teamStats.find((t) => t.team.id === compareTeamB) || teamStats[1];

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {seasonYear} NFL Team & Player Telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Offense vs. Defense efficiency quadrant scatter plot, sortable 32-team rankings, player stat leaderboards, and head-to-head comparison.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'teams' as const, label: 'Team Stats & Quadrant', icon: <Crosshair className="w-3.5 h-3.5" /> },
            { id: 'players' as const, label: 'Player Leaderboards', icon: <User className="w-3.5 h-3.5" /> },
            { id: 'compare' as const, label: 'Head-to-Head Comparator', icon: <GitCompare className="w-3.5 h-3.5" /> },
            { id: 'watchlist' as const, label: `Player Watchlist (${watchlist.length})`, icon: <Star className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                subTab === t.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: TEAM STATS & OFFENSE/DEFENSE QUADRANT */}
      {subTab === 'teams' && (
        <div className="space-y-6">
          {/* Interactive Offense vs Defense Quadrant Scatter Plot */}
          {quadrantData && (
            <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <span>Offense vs. Defense Efficiency Quadrant (All 32 Teams)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    X-Axis: Offensive Production (Right is better) • Y-Axis: Defensive Allowed (Top is stingier/better). Click any team logo to inspect.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setQuadrantMetric('points')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      quadrantMetric === 'points'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Points / Game (PPG vs PAPG)
                  </button>
                  <button
                    onClick={() => setQuadrantMetric('yards')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      quadrantMetric === 'yards'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Total Yards / Game
                  </button>
                </div>
              </div>

              <div className="relative bg-slate-950/90 border border-slate-800 rounded-xl p-4 overflow-hidden">
                <svg viewBox="0 0 800 420" className="w-full h-[360px] sm:h-[420px]">
                  {/* Quadrant Background Labels */}
                  <text
                    x="780"
                    y="30"
                    textAnchor="end"
                    fill="#10b981"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    opacity="0.7"
                  >
                    ELITE CONTENDERS (High Off / Lockdown Def)
                  </text>
                  <text
                    x="20"
                    y="30"
                    textAnchor="start"
                    fill="#38bdf8"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    opacity="0.7"
                  >
                    DEFENSIVE GRINDERS (Low Off / Lockdown Def)
                  </text>
                  <text
                    x="780"
                    y="400"
                    textAnchor="end"
                    fill="#f59e0b"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    opacity="0.7"
                  >
                    SHOOTOUT TEAMS (High Off / Porous Def)
                  </text>
                  <text
                    x="20"
                    y="400"
                    textAnchor="start"
                    fill="#f43f5e"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    opacity="0.7"
                  >
                    STRUGGLING (Low Off / Porous Def)
                  </text>

                  {/* League Average Crosshairs */}
                  {(() => {
                    const { minX, maxX, minY, maxY, avgX, avgY } = quadrantData;
                    const cx = 50 + ((avgX - minX) / Math.max(1e-5, maxX - minX)) * 700;
                    // Inverted Y: lower PAPG is higher up on the chart (smaller SVG y)
                    const cy = 35 + ((avgY - minY) / Math.max(1e-5, maxY - minY)) * 340;
                    return (
                      <>
                        <line
                          x1={cx}
                          y1={20}
                          x2={cx}
                          y2={390}
                          stroke="#475569"
                          strokeDasharray="5 5"
                          strokeWidth="1.5"
                        />
                        <line
                          x1={40}
                          y1={cy}
                          x2={760}
                          y2={cy}
                          stroke="#475569"
                          strokeDasharray="5 5"
                          strokeWidth="1.5"
                        />
                        <text
                          x={cx + 6}
                          y={386}
                          fill="#94a3b8"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          NFL Avg Off: {avgX.toFixed(1)}
                        </text>
                        <text
                          x={45}
                          y={cy - 6}
                          fill="#94a3b8"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          NFL Avg Def Allowed: {avgY.toFixed(1)}
                        </text>
                      </>
                    );
                  })()}

                  {/* Plot All 32 Team Logos */}
                  {teamStats.map((row) => {
                    const { minX, maxX, minY, maxY } = quadrantData;
                    const valX = quadrantMetric === 'points' ? row.ppg : row.totalYpg;
                    const valY = quadrantMetric === 'points' ? row.papg : row.defTotalYpg;

                    const x = 50 + ((valX - minX) / Math.max(1e-5, maxX - minX)) * 700;
                    const y = 35 + ((valY - minY) / Math.max(1e-5, maxY - minY)) * 340;
                    const isHovered = hoveredTeamId === row.team.id;
                    const isFav = favoriteTeamIds.includes(row.team.id);

                    return (
                      <g
                        key={row.team.id}
                        transform={`translate(${x}, ${y})`}
                        className="cursor-pointer transition-transform"
                        onMouseEnter={() => setHoveredTeamId(row.team.id)}
                        onMouseLeave={() => setHoveredTeamId(null)}
                        onClick={() => onSelectTeam(row.team.id)}
                      >
                        {(isHovered || isFav) && (
                          <circle
                            r={isHovered ? 20 : 16}
                            fill={isFav ? 'rgba(251,191,36,0.2)' : 'rgba(16,185,129,0.25)'}
                            stroke={isFav ? '#fbbf24' : '#10b981'}
                            strokeWidth="2"
                          />
                        )}
                        <image
                          href={row.team.logo}
                          x={isHovered ? -16 : -13}
                          y={isHovered ? -16 : -13}
                          width={isHovered ? 32 : 26}
                          height={isHovered ? 32 : 26}
                        />
                        {isHovered && (
                          <g transform="translate(0, -24)">
                            <rect
                              x="-75"
                              y="-26"
                              width="150"
                              height="22"
                              rx="6"
                              fill="#020617"
                              stroke="#10b981"
                              strokeWidth="1"
                            />
                            <text
                              x="0"
                              y="-11"
                              textAnchor="middle"
                              fill="#f8fafc"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {row.team.abbr}: Off {valX} / Def {valY}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Full 32-Team Sortable Statistics Table */}
          <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                  32-Team Offensive & Defensive Telemetry Rankings
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Click any stat column to sort
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-3 w-10">RK</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Team</th>
                    <th className="py-2.5 px-2 text-center">REC</th>
                    <th
                      onClick={() => handleTeamSort('ppg')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      OFF PPG
                    </th>
                    <th
                      onClick={() => handleTeamSort('papg')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      DEF PAPG
                    </th>
                    <th
                      onClick={() => handleTeamSort('pointDiffPerGame')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      DIFF/G
                    </th>
                    <th
                      onClick={() => handleTeamSort('totalYpg')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      OFF YPG
                    </th>
                    <th
                      onClick={() => handleTeamSort('passYpg')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      PASS YPG
                    </th>
                    <th
                      onClick={() => handleTeamSort('rushYpg')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      RUSH YPG
                    </th>
                    <th
                      onClick={() => handleTeamSort('defTotalYpg')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      DEF YPG
                    </th>
                    <th
                      onClick={() => handleTeamSort('thirdDownPct')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      3RD %
                    </th>
                    <th
                      onClick={() => handleTeamSort('redZonePct')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      RZ %
                    </th>
                    <th
                      onClick={() => handleTeamSort('turnoverDiff')}
                      className="py-2.5 px-2.5 text-right cursor-pointer hover:text-white"
                    >
                      TO DIFF
                    </th>
                    <th
                      onClick={() => handleTeamSort('sacks')}
                      className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      SACKS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-mono">
                  {sortedTeams.map((row, idx) => (
                    <tr
                      key={row.team.id}
                      onClick={() => onSelectTeam(row.team.id)}
                      className="hover:bg-slate-800/50 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3 text-slate-500 font-bold">#{idx + 1}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={row.team.logo}
                            alt={row.team.abbr}
                            className="w-6 h-6 object-contain"
                          />
                          <span className="font-bold text-white hover:text-emerald-300">
                            {row.team.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-300">
                        {row.wins}-{row.losses}
                        {row.ties > 0 ? `-${row.ties}` : ''}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-emerald-400">
                        {row.ppg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-cyan-300">
                        {row.papg.toFixed(1)}
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-bold ${
                          row.pointDiffPerGame > 0
                            ? 'text-emerald-400'
                            : row.pointDiffPerGame < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.pointDiffPerGame > 0
                          ? `+${row.pointDiffPerGame.toFixed(1)}`
                          : row.pointDiffPerGame.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-200">
                        {row.totalYpg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {row.passYpg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {row.rushYpg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {row.defTotalYpg.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {row.thirdDownPct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-slate-300">
                        {row.redZonePct.toFixed(1)}%
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-bold ${
                          row.turnoverDiff > 0
                            ? 'text-emerald-400'
                            : row.turnoverDiff < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.turnoverDiff > 0 ? `+${row.turnoverDiff}` : row.turnoverDiff}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{row.sacks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PLAYER STAT LEADERBOARDS */}
      {subTab === 'players' && (
        <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'passing', label: 'Passing Leaders' },
                  { id: 'rushing', label: 'Rushing Leaders' },
                  { id: 'receiving', label: 'Receiving Leaders' },
                  { id: 'defense', label: 'Defensive Leaders' },
                  { id: 'kicking', label: 'Scoring / Kicking' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setPlayerCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    playerCategory === cat.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="Filter player or team..."
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No player leaderboard entries found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredPlayers.map((p, idx) => {
                const isWatched = watchlistIds.has(p.id);
                return (
                  <div
                    key={`${p.category}-${p.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-xs font-mono font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <img
                        src={p.headshot}
                        alt={p.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = p.teamLogo;
                        }}
                        className="w-10 h-10 rounded-full object-cover bg-slate-900 border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {p.name}
                          </span>
                          <button
                            onClick={() =>
                              isWatched
                                ? onRemoveWatchlist(p.id)
                                : onAddWatchlist({
                                    athleteId: p.id,
                                    fullName: p.name,
                                    position: p.position,
                                    teamAbbr: p.teamAbbr,
                                    headshotUrl: p.headshot,
                                    notes: `${p.primaryStatDisplay} ${p.primaryStatLabel}`,
                                  })
                            }
                            className="p-0.5 cursor-pointer"
                            title={
                              isWatched ? 'Remove from Player Watchlist' : 'Add to Player Watchlist'
                            }
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isWatched
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-600 hover:text-slate-300'
                              }`}
                            />
                          </button>
                        </div>
                        <button
                          onClick={() => onSelectTeam(p.teamId)}
                          className="text-[11px] font-mono text-slate-400 hover:text-emerald-300 cursor-pointer"
                        >
                          {p.teamAbbr} • {p.position} {p.jersey ? `#${p.jersey}` : ''}
                        </button>
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="text-sm font-black text-emerald-400">
                        {p.primaryStatDisplay}
                      </div>
                      <div className="text-[10px] text-slate-500">{p.primaryStatLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: HEAD-TO-HEAD FRANCHISE COMPARATOR */}
      {subTab === 'compare' && teamAObj && teamBObj && (
        <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-b border-slate-800 pb-5">
            {/* Team A Selector */}
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-cyan-500/40">
              <img
                src={teamAObj.team.logo}
                alt={teamAObj.team.abbr}
                className="w-12 h-12 object-contain"
              />
              <div className="flex-1">
                <div className="text-[10px] font-mono uppercase text-cyan-400">
                  Franchise A
                </div>
                <select
                  value={compareTeamA}
                  onChange={(e) => setCompareTeamA(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                >
                  {teamStats.map((t) => (
                    <option
                      key={t.team.id}
                      value={t.team.id}
                      className="bg-slate-900 text-white"
                    >
                      {t.team.displayName} ({t.wins}-{t.losses})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-400">
              VS • Head-to-Head Telemetry
            </div>

            {/* Team B Selector */}
            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-emerald-500/40">
              <img
                src={teamBObj.team.logo}
                alt={teamBObj.team.abbr}
                className="w-12 h-12 object-contain"
              />
              <div className="flex-1">
                <div className="text-[10px] font-mono uppercase text-emerald-400">
                  Franchise B
                </div>
                <select
                  value={compareTeamB}
                  onChange={(e) => setCompareTeamB(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                >
                  {teamStats.map((t) => (
                    <option
                      key={t.team.id}
                      value={t.team.id}
                      className="bg-slate-900 text-white"
                    >
                      {t.team.displayName} ({t.wins}-{t.losses})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Comparison Bars */}
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { label: 'Points Per Game (Offense)', a: teamAObj.ppg, b: teamBObj.ppg, higherBetter: true },
              { label: 'Points Allowed Per Game (Defense)', a: teamAObj.papg, b: teamBObj.papg, higherBetter: false },
              { label: 'Total Offensive Yards / Game', a: teamAObj.totalYpg, b: teamBObj.totalYpg, higherBetter: true },
              { label: 'Passing Yards / Game', a: teamAObj.passYpg, b: teamBObj.passYpg, higherBetter: true },
              { label: 'Rushing Yards / Game', a: teamAObj.rushYpg, b: teamBObj.rushYpg, higherBetter: true },
              { label: 'Defensive Yards Allowed / Game', a: teamAObj.defTotalYpg, b: teamBObj.defTotalYpg, higherBetter: false },
              { label: '3rd Down Conversion %', a: teamAObj.thirdDownPct, b: teamBObj.thirdDownPct, higherBetter: true },
              { label: 'Red Zone TD %', a: teamAObj.redZonePct, b: teamBObj.redZonePct, higherBetter: true },
              { label: 'Defensive Sacks', a: teamAObj.sacks, b: teamBObj.sacks, higherBetter: true },
            ].map((m) => {
              const total = Math.max(1, m.a + m.b);
              const pctA = (m.a / total) * 100;
              const aWins = m.higherBetter ? m.a >= m.b : m.a <= m.b;

              return (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span
                      className={`font-bold ${
                        aWins ? 'text-cyan-300 text-sm' : 'text-slate-400'
                      }`}
                    >
                      {m.a}
                    </span>
                    <span className="font-sans text-slate-300 font-semibold">
                      {m.label}
                    </span>
                    <span
                      className={`font-bold ${
                        !aWins ? 'text-emerald-300 text-sm' : 'text-slate-400'
                      }`}
                    >
                      {m.b}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden flex">
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${pctA}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${100 - pctA}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 4: PERSISTENT PLAYER WATCHLIST */}
      {subTab === 'watchlist' && (
        <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Pinned Player Watchlist (Saved in SQLite)
              </h2>
              <p className="text-xs text-slate-400">
                Star players from the Player Leaderboards or Team Rosters to track them here.
              </p>
            </div>
          </div>

          {watchlist.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Your Player Watchlist is empty. Click the star icon next to any player in the Leaderboards or Team Roster tabs to pin them!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((w) => (
                <div
                  key={w.athleteId}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    {w.headshotUrl ? (
                      <img
                        src={w.headshotUrl}
                        alt={w.fullName}
                        className="w-11 h-11 rounded-full object-cover bg-slate-900 border border-slate-700"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-500" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{w.fullName}</div>
                      <div className="text-[11px] font-mono text-emerald-400">
                        {w.teamAbbr} • {w.position}
                      </div>
                      {w.notes && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {w.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveWatchlist(w.athleteId)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 cursor-pointer"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
