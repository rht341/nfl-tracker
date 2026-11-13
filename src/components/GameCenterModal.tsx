import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ListOrdered,
  MapPin,
  RefreshCw,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { GameCenterDetail } from '../types/nfl.ts';

interface GameCenterModalProps {
  gameId: string | null;
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
}

export const GameCenterModal: React.FC<GameCenterModalProps> = ({
  gameId,
  onClose,
  onSelectTeam,
}) => {
  const [detail, setDetail] = useState<GameCenterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'boxscore' | 'drives'>('overview');
  const [boxSide, setBoxSide] = useState<'away' | 'home'>('away');
  const [expandedDrives, setExpandedDrives] = useState<Record<string, boolean>>({});

  const loadGame = async (force = false) => {
    if (!gameId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/game/${gameId}${force ? '?force=1' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GameCenterDetail;
      setDetail(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load Game Center telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId) {
      setActiveTab('overview');
      setBoxSide('away');
      setExpandedDrives({});
      loadGame(false);
    } else {
      setDetail(null);
    }
  }, [gameId]);

  if (!gameId) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-[#0b101b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Bar */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
            <Activity className="w-4 h-4" />
            <span>NFL Broadcast Game Center</span>
            {detail && (
              <span className="text-slate-400">
                • {detail.game.seasonYear} {detail.game.weekLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadGame(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading && !detail ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <div className="text-sm font-mono text-slate-300">
              Loading Box Score, Play-by-Play & Telemetry...
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 text-sm">{error}</div>
        ) : detail ? (
          <>
            {/* Matchup Scoreboard Hero Banner */}
            <div className="p-5 bg-gradient-to-b from-slate-900/90 to-[#0b101b] border-b border-slate-800">
              <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-6">
                {/* Away Team */}
                <div className="flex items-center justify-between lg:justify-start gap-4">
                  <img
                    src={detail.game.awayTeam.logo}
                    alt={detail.game.awayTeam.abbr}
                    className="w-14 h-14 object-contain"
                  />
                  <div>
                    <button
                      onClick={() => {
                        onSelectTeam(detail.game.awayTeam.id);
                        onClose();
                      }}
                      className="text-lg font-black text-white hover:text-emerald-300 transition text-left cursor-pointer"
                    >
                      {detail.game.awayTeam.displayName}
                    </button>
                    <div className="text-xs font-mono text-slate-400">
                      {detail.game.awayTeam.record} • Away
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-white ml-auto">
                    {detail.game.awayTeam.score}
                  </div>
                </div>

                {/* Center Linescore Table & Game Status */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-xs font-mono font-bold text-emerald-400 uppercase mb-2">
                    {detail.game.statusDetail}
                  </div>
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-1">TEAM</th>
                        {Array.from({
                          length: Math.max(
                            4,
                            detail.game.awayTeam.linescores.length,
                            detail.game.homeTeam.linescores.length
                          ),
                        }).map((_, idx) => (
                          <th key={idx} className="py-1 px-1.5">
                            {idx < 4 ? `Q${idx + 1}` : 'OT'}
                          </th>
                        ))}
                        <th className="py-1 pl-2 text-right text-white">T</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="py-1 text-left font-bold text-slate-200">
                          {detail.game.awayTeam.abbr}
                        </td>
                        {Array.from({
                          length: Math.max(
                            4,
                            detail.game.awayTeam.linescores.length,
                            detail.game.homeTeam.linescores.length
                          ),
                        }).map((_, idx) => (
                          <td key={idx} className="py-1 px-1.5 text-slate-400">
                            {detail.game.awayTeam.linescores[idx] ?? '-'}
                          </td>
                        ))}
                        <td className="py-1 pl-2 text-right font-bold text-white">
                          {detail.game.awayTeam.score}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-left font-bold text-slate-200">
                          {detail.game.homeTeam.abbr}
                        </td>
                        {Array.from({
                          length: Math.max(
                            4,
                            detail.game.awayTeam.linescores.length,
                            detail.game.homeTeam.linescores.length
                          ),
                        }).map((_, idx) => (
                          <td key={idx} className="py-1 px-1.5 text-slate-400">
                            {detail.game.homeTeam.linescores[idx] ?? '-'}
                          </td>
                        ))}
                        <td className="py-1 pl-2 text-right font-bold text-white">
                          {detail.game.homeTeam.score}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Home Team */}
                <div className="flex items-center justify-between lg:justify-end gap-4">
                  <div className="text-3xl sm:text-4xl font-mono font-black text-white mr-auto lg:mr-0">
                    {detail.game.homeTeam.score}
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => {
                        onSelectTeam(detail.game.homeTeam.id);
                        onClose();
                      }}
                      className="text-lg font-black text-white hover:text-emerald-300 transition text-right cursor-pointer"
                    >
                      {detail.game.homeTeam.displayName}
                    </button>
                    <div className="text-xs font-mono text-slate-400">
                      {detail.game.homeTeam.record} • Home
                    </div>
                  </div>
                  <img
                    src={detail.game.homeTeam.logo}
                    alt={detail.game.homeTeam.abbr}
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>

              {/* Venue / Weather / Attendance Sub-strip */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {detail.gameInfo.venue}
                    {detail.gameInfo.cityState ? ` (${detail.gameInfo.cityState})` : ''}
                  </span>
                  {detail.gameInfo.weather && <span>• Weather: {detail.gameInfo.weather}</span>}
                  {detail.gameInfo.attendance && (
                    <span>• Attendance: {detail.gameInfo.attendance.toLocaleString()}</span>
                  )}
                </div>

                {/* Modal Sub-navigation Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[
                    { id: 'overview' as const, label: 'Scoring & Team Comparison', icon: <BarChart2 className="w-3.5 h-3.5" /> },
                    { id: 'boxscore' as const, label: 'Player Box Scores', icon: <Users className="w-3.5 h-3.5" /> },
                    { id: 'drives' as const, label: `Drives & Play-by-Play (${detail.drives.length})`, icon: <ListOrdered className="w-3.5 h-3.5" /> },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        activeTab === t.id
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
            </div>

            {/* Scrollable Modal Content Area */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 Cols: Scoring Summary + Win Probability Chart */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Win Probability SVG Chart */}
                    {detail.winProbability.length > 2 && (
                      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>Real-Time Win Probability Telemetry</span>
                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span className="text-cyan-400">
                              ▲ {detail.game.homeTeam.abbr} (Home)
                            </span>
                            <span className="text-rose-400">
                              ▼ {detail.game.awayTeam.abbr} (Away)
                            </span>
                          </div>
                        </div>

                        <div className="h-36 w-full">
                          <svg viewBox="0 0 600 130" className="w-full h-full overflow-visible">
                            {/* 50% Midline */}
                            <line
                              x1="0"
                              y1="65"
                              x2="600"
                              y2="65"
                              stroke="#334155"
                              strokeDasharray="4 4"
                              strokeWidth="1"
                            />
                            <text x="4" y="14" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                              100% {detail.game.homeTeam.abbr}
                            </text>
                            <text x="4" y="61" fill="#64748b" fontSize="9" fontFamily="monospace">
                              50%
                            </text>
                            <text x="4" y="124" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                              100% {detail.game.awayTeam.abbr}
                            </text>

                            {/* Polyline of Home Win % */}
                            <polyline
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2.5"
                              points={detail.winProbability
                                .map((pt, i) => {
                                  const x =
                                    (i / Math.max(1, detail.winProbability.length - 1)) * 600;
                                  const y = 125 - (pt.homeWinPct / 100) * 120;
                                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                                })
                                .join(' ')}
                            />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Scoring Plays */}
                    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-white">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Scoring Summary ({detail.scoringPlays.length} Scoring Plays)</span>
                      </div>

                      {detail.scoringPlays.length === 0 ? (
                        <div className="text-xs text-slate-400 py-6 text-center">
                          No scoring plays recorded yet for this matchup.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {detail.scoringPlays.map((sp) => (
                            <div
                              key={sp.id}
                              className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80"
                            >
                              <div className="flex items-start gap-3">
                                <img
                                  src={sp.teamLogo}
                                  alt={sp.teamAbbr}
                                  className="w-7 h-7 object-contain shrink-0 mt-0.5"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                                      {sp.type}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                      Q{sp.period} • {sp.clock}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                                    {sp.text}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right font-mono shrink-0">
                                <div className="text-[10px] text-slate-500">
                                  {detail.game.awayTeam.abbr} - {detail.game.homeTeam.abbr}
                                </div>
                                <div className="text-xs font-bold text-white">
                                  {sp.awayScore} - {sp.homeScore}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right 5 Cols: Team Stat Comparison Dual Bars */}
                  <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={detail.game.awayTeam.logo}
                          alt={detail.game.awayTeam.abbr}
                          className="w-5 h-5 object-contain"
                        />
                        <span className="text-xs font-mono font-bold text-white">
                          {detail.game.awayTeam.abbr}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        Team Telemetry
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          {detail.game.homeTeam.abbr}
                        </span>
                        <img
                          src={detail.game.homeTeam.logo}
                          alt={detail.game.homeTeam.abbr}
                          className="w-5 h-5 object-contain"
                        />
                      </div>
                    </div>

                    {detail.teamStats.length === 0 ? (
                      <div className="text-xs text-slate-400 py-8 text-center">
                        Team statistics will populate once the game kicks off.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detail.teamStats.map((st) => {
                          const total = st.awayNumeric + st.homeNumeric;
                          const awayPct = total > 0 ? (st.awayNumeric / total) * 100 : 50;
                          return (
                            <div key={st.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="font-bold text-cyan-300">{st.awayValue}</span>
                                <span className="text-[11px] font-sans text-slate-400">
                                  {st.label}
                                </span>
                                <span className="font-bold text-emerald-300">{st.homeValue}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-950 overflow-hidden flex">
                                <div
                                  className="h-full bg-cyan-500 transition-all"
                                  style={{ width: `${awayPct}%` }}
                                />
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{ width: `${100 - awayPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'boxscore' && (
                <div className="space-y-4">
                  {/* Team Toggle for Box Score */}
                  <div className="flex items-center gap-2">
                    {[
                      { side: 'away' as const, team: detail.game.awayTeam },
                      { side: 'home' as const, team: detail.game.homeTeam },
                    ].map(({ side, team }) => (
                      <button
                        key={side}
                        onClick={() => setBoxSide(side)}
                        className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          boxSide === side
                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <img src={team.logo} alt={team.abbr} className="w-5 h-5 object-contain" />
                        <span>{team.displayName} Box Score</span>
                      </button>
                    ))}
                  </div>

                  {detail.boxScore[boxSide].length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                      No player box score categories available for this game yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {detail.boxScore[boxSide].map((cat) => (
                        <div
                          key={cat.name}
                          className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                            {cat.name}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-950/40">
                                  <th className="py-2 px-3 min-w-[160px]">Player</th>
                                  {cat.labels.map((lbl, i) => (
                                    <th key={i} className="py-2 px-2.5 text-right">
                                      {lbl}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 font-mono">
                                {cat.athletes.map((ath) => (
                                  <tr key={ath.id} className="hover:bg-slate-800/40">
                                    <td className="py-2 px-3 font-sans">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{ath.name}</span>
                                        <span className="text-[10px] font-mono text-slate-500">
                                          #{ath.jersey} {ath.position}
                                        </span>
                                      </div>
                                    </td>
                                    {ath.stats.map((stVal, sIdx) => (
                                      <td
                                        key={sIdx}
                                        className="py-2 px-2.5 text-right text-slate-200"
                                      >
                                        {stVal}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                                {cat.totals.length > 0 && (
                                  <tr className="bg-slate-950/70 font-bold text-emerald-300">
                                    <td className="py-2 px-3 font-sans uppercase text-[11px]">
                                      Team Total
                                    </td>
                                    {cat.totals.map((tot, tIdx) => (
                                      <td key={tIdx} className="py-2 px-2.5 text-right">
                                        {tot}
                                      </td>
                                    ))}
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'drives' && (
                <div className="space-y-2.5">
                  {detail.drives.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                      No drive chart data available for this game.
                    </div>
                  ) : (
                    detail.drives.map((drv) => {
                      const isOpen = Boolean(expandedDrives[drv.id]);
                      return (
                        <div
                          key={drv.id}
                          className={`rounded-xl border overflow-hidden ${
                            drv.isScore
                              ? 'bg-emerald-950/15 border-emerald-500/40'
                              : 'bg-slate-900/70 border-slate-800'
                          }`}
                        >
                          <button
                            onClick={() =>
                              setExpandedDrives((prev) => ({
                                ...prev,
                                [drv.id]: !prev[drv.id],
                              }))
                            }
                            className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={drv.teamLogo}
                                alt={drv.teamAbbr}
                                className="w-6 h-6 object-contain"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                                      drv.isScore
                                        ? 'bg-emerald-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {drv.result}
                                  </span>
                                  <span className="text-xs font-bold text-white">
                                    {drv.description}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  {drv.plays} plays • {drv.yards} yds • {drv.timeElapsed}
                                </div>
                              </div>
                            </div>
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {isOpen && drv.playList.length > 0 && (
                            <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800/80 space-y-2">
                              {drv.playList.map((pl) => (
                                <div
                                  key={pl.id}
                                  className={`text-xs p-2 rounded-lg border font-mono ${
                                    pl.scoringPlay
                                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                      : 'bg-slate-900/60 border-slate-800/70 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                                    <span>
                                      Q{pl.period} • {pl.clock}
                                    </span>
                                    <span>{pl.downDistance}</span>
                                  </div>
                                  <div className="font-sans">{pl.text}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
