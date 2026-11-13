import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { TeamDeepDiveData, WatchlistPlayer } from '../types/nfl.ts';
import { NFL_TEAMS } from '../utils/nflTeams.ts';

interface TeamDetailViewProps {
  teamId: string;
  seasonYear: number;
  favoriteTeamIds: string[];
  watchlist: WatchlistPlayer[];
  onToggleFavorite: (teamId: string, teamAbbr: string) => void;
  onAddWatchlist: (player: Omit<WatchlistPlayer, 'createdAt'>) => Promise<void>;
  onRemoveWatchlist: (athleteId: string) => Promise<void>;
  onSelectTeam: (teamId: string) => void;
  onOpenGame: (gameId: string) => void;
  onBack: () => void;
}

export const TeamDetailView: React.FC<TeamDetailViewProps> = ({
  teamId,
  seasonYear,
  favoriteTeamIds,
  watchlist,
  onToggleFavorite,
  onAddWatchlist,
  onRemoveWatchlist,
  onSelectTeam,
  onOpenGame,
  onBack,
}) => {
  const [data, setData] = useState<TeamDeepDiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'schedule' | 'roster' | 'injuries'>('schedule');
  const [rosterGroup, setRosterGroup] = useState<'ALL' | 'Offense' | 'Defense' | 'Special Teams'>(
    'ALL'
  );
  const [rosterSearch, setRosterSearch] = useState('');

  const loadTeam = async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}?season=${seasonYear}${force ? '&force=1' : ''}`
      );
      if (res.ok) {
        const json = (await res.json()) as TeamDeepDiveData;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam(false);
  }, [teamId, seasonYear]);

  const watchlistIds = useMemo(
    () => new Set(watchlist.map((w) => w.athleteId)),
    [watchlist]
  );

  const filteredRoster = useMemo(() => {
    if (!data) return [];
    const q = rosterSearch.trim().toLowerCase();
    return data.roster.filter((r) => {
      if (rosterGroup !== 'ALL' && r.group !== rosterGroup) return false;
      if (
        q &&
        !r.fullName.toLowerCase().includes(q) &&
        !r.position.toLowerCase().includes(q) &&
        !(r.college || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data, rosterGroup, rosterSearch]);

  if (loading && !data) {
    return (
      <div className="bg-[#0d121d] border border-slate-800 rounded-2xl p-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <div className="text-sm font-mono text-slate-300">
          Loading Franchise Deep-Dive, Roster & Injury Report...
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { team, standing, teamStats, schedule, injuries } = data;
  const isFav = favoriteTeamIds.includes(team.id);

  return (
    <div className="space-y-6">
      {/* Top Franchise Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Standings</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Switch Franchise:</span>
          <select
            value={team.id}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white cursor-pointer"
          >
            {NFL_TEAMS.map((t) => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                {t.abbr} — {t.displayName} ({t.fullDivision})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Team Hero Banner */}
      <div
        className="rounded-2xl border border-slate-700/80 p-6 shadow-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${team.primaryColor}45 0%, ${team.secondaryColor}25 45%, #0d121d 100%)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={team.logo}
              alt={team.abbr}
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-2xl"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[11px] font-mono font-bold text-emerald-400">
                  {team.fullDivision} • #{standing.divisionRank || 1} in Division
                </span>
                {standing.seed && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] font-mono font-bold text-amber-300">
                    {team.conference} Seed #{standing.seed}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                {team.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 mt-1.5">
                <span className="font-bold text-white text-sm">
                  Record: {standing.wins}-{standing.losses}
                  {standing.ties > 0 ? `-${standing.ties}` : ''} (
                  {standing.winPct.toFixed(3).replace(/^0/, '')})
                </span>
                <span>• Home: {standing.homeRecord}</span>
                <span>• Away: {standing.awayRecord}</span>
                <span>• Div: {standing.divRecord}</span>
                <span>• Conf: {standing.confRecord}</span>
                <span>• Streak: {standing.streak}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleFavorite(team.id, team.abbr)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isFav
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/50'
                : 'bg-slate-950/80 hover:bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-slate-950' : ''}`} />
            <span>{isFav ? 'Pinned to Spotlight' : 'Pin to Spotlight'}</span>
          </button>
        </div>

        {/* Key Season Stat Split Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mt-6 pt-5 border-t border-slate-800/80 font-mono">
          {[
            { label: 'OFF PPG', val: teamStats.ppg.toFixed(1), color: 'text-emerald-400' },
            { label: 'DEF PAPG', val: teamStats.papg.toFixed(1), color: 'text-cyan-400' },
            {
              label: 'POINT DIFF',
              val: standing.pointDiff > 0 ? `+${standing.pointDiff}` : String(standing.pointDiff),
              color: standing.pointDiff >= 0 ? 'text-emerald-400' : 'text-rose-400',
            },
            { label: 'TOTAL YPG', val: teamStats.totalYpg.toFixed(1), color: 'text-white' },
            { label: 'PASS YPG', val: teamStats.passYpg.toFixed(1), color: 'text-slate-200' },
            { label: 'RUSH YPG', val: teamStats.rushYpg.toFixed(1), color: 'text-slate-200' },
            { label: 'SOV', val: standing.sov.toFixed(3).replace(/^0/, ''), color: 'text-indigo-300' },
            { label: 'SOS', val: standing.sos.toFixed(3).replace(/^0/, ''), color: 'text-slate-300' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 text-center"
            >
              <div className="text-[10px] text-slate-400 uppercase">{stat.label}</div>
              <div className={`text-base font-black mt-0.5 ${stat.color}`}>{stat.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-Navigation Tabs: Schedule & Results | Depth Roster | Injury Report */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d121d] p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          {[
            {
              id: 'schedule' as const,
              label: `Full Season Schedule (${schedule.length})`,
              icon: <Calendar className="w-4 h-4" />,
            },
            {
              id: 'roster' as const,
              label: `Active Roster (${data.roster.length})`,
              icon: <Users className="w-4 h-4" />,
            },
            {
              id: 'injuries' as const,
              label: `Injury Report (${injuries.length})`,
              icon: <AlertTriangle className="w-4 h-4" />,
            },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                subTab === t.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SCHEDULE & RESULTS */}
      {subTab === 'schedule' && (
        <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
              <div className="text-xs font-mono text-slate-400">
                Loading full season schedule for {team.displayName}...
              </div>
            </div>
          ) : schedule.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calendar className="w-6 h-6 text-slate-500 mx-auto" />
              <div className="text-sm font-bold text-white">No Schedule Games Found</div>
              <button
                onClick={() => loadTeam(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Retry Sync
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-2.5 px-4">Week</th>
                    <th className="py-2.5 px-4">Date / Kickoff</th>
                    <th className="py-2.5 px-4">Opponent</th>
                    <th className="py-2.5 px-4">Result / Status</th>
                    <th className="py-2.5 px-4">Venue / Broadcast</th>
                    <th className="py-2.5 px-4 text-right">Game Center</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(() => {
                    const regWeeksPlayed = new Set(
                      schedule.filter((g) => g.seasonType === 2).map((g) => g.week)
                    );
                    let byeWeek = 0;
                    if (regWeeksPlayed.size >= 14) {
                      for (let w = 4; w <= 15; w++) {
                        if (!regWeeksPlayed.has(w)) {
                          byeWeek = w;
                          break;
                        }
                      }
                    }

                    const rows: React.ReactNode[] = [];
                    let byeInserted = false;

                    for (const g of schedule) {
                      if (
                        !byeInserted &&
                        byeWeek > 0 &&
                        g.seasonType === 2 &&
                        g.week > byeWeek
                      ) {
                        byeInserted = true;
                        rows.push(
                          <tr
                            key={`bye-${byeWeek}`}
                            className="bg-slate-950/60 text-slate-500 font-mono"
                          >
                            <td className="py-2.5 px-4 font-bold text-amber-400/80">
                              Week {byeWeek}
                            </td>
                            <td className="py-2.5 px-4">—</td>
                            <td colSpan={4} className="py-2.5 px-4 uppercase tracking-widest text-[11px] font-bold text-amber-400/80">
                              BYE WEEK • No Scheduled Game
                            </td>
                          </tr>
                        );
                      }

                      const isHome = g.homeTeam.id === team.id;
                      const opp = isHome ? g.awayTeam : g.homeTeam;
                      const myScore = isHome ? g.homeTeam.score : g.awayTeam.score;
                      const oppScore = isHome ? g.awayTeam.score : g.homeTeam.score;
                      const isPost = g.statusState === 'post';
                      const won = isPost && myScore > oppScore;
                      const tied = isPost && myScore === oppScore;

                      rows.push(
                        <tr
                          key={g.id}
                          onClick={() => onOpenGame(g.id)}
                          className="hover:bg-slate-800/50 transition cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-300">
                            {g.weekLabel}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {new Date(g.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[11px] text-slate-500 w-4">
                                {isHome ? 'vs' : '@'}
                              </span>
                              <img
                                src={opp.logo}
                                alt={opp.abbr}
                                className="w-6 h-6 object-contain"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTeam(opp.id);
                                }}
                                className="font-bold text-white hover:text-emerald-300 cursor-pointer"
                              >
                                {opp.displayName}
                              </button>
                              <span className="text-[10px] font-mono text-slate-500">
                                ({opp.record})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {isPost ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                                    won
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : tied
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {won ? 'W' : tied ? 'T' : 'L'}
                                </span>
                                <span className="font-bold text-white">
                                  {myScore} - {oppScore}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">{g.shortDetail}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {g.venue} {g.broadcast ? `• ${g.broadcast}` : ''}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold">
                              <span>Box Score</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE ROSTER */}
      {subTab === 'roster' && (
        <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['ALL', 'Offense', 'Defense', 'Special Teams'] as const).map((grp) => (
                <button
                  key={grp}
                  onClick={() => setRosterGroup(grp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    rosterGroup === grp
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search player, position, or college..."
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredRoster.map((p) => {
              const isWatched = watchlistIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.headshot ? (
                      <img
                        src={p.headshot}
                        alt={p.fullName}
                        className="w-11 h-11 rounded-full object-cover bg-slate-900 border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-400 shrink-0">
                        #{p.jersey}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {p.fullName}
                        </span>
                        {p.injuryStatus && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold">
                            {p.injuryStatus}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400">
                        #{p.jersey} • {p.position} ({p.group})
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {[p.height, p.weight, p.college].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      isWatched
                        ? onRemoveWatchlist(p.id)
                        : onAddWatchlist({
                            athleteId: p.id,
                            fullName: p.fullName,
                            position: p.position,
                            teamAbbr: team.abbr,
                            headshotUrl: p.headshot || '',
                            notes: `#${p.jersey} ${p.group}`,
                          })
                    }
                    className="p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer shrink-0"
                    title={isWatched ? 'Remove from Watchlist' : 'Pin to Watchlist'}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isWatched ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: INJURY REPORT */}
      {subTab === 'injuries' && (
        <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4">
          {injuries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Shield className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">No Active Injuries Reported</div>
              <p className="text-xs text-slate-400">
                ESPN currently lists zero active injury designations for {team.displayName}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {injuries.map((inj) => (
                <div
                  key={inj.athleteId}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3"
                >
                  {inj.headshot && (
                    <img
                      src={inj.headshot}
                      alt={inj.name}
                      className="w-11 h-11 rounded-full object-cover bg-slate-900 border border-slate-700 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        {inj.name} (#{inj.jersey} {inj.position})
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold">
                        {inj.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                      {inj.type}
                    </div>
                    {inj.detail && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {inj.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
