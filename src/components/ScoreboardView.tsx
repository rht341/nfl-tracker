import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  MapPin,
  Radio,
  Star,
  Tv,
} from 'lucide-react';
import { SeasonGame } from '../types/nfl.ts';
import { NFL_TEAMS } from '../utils/nflTeams.ts';

interface ScoreboardViewProps {
  seasonYear: number;
  seasonType: number;
  setSeasonType: (type: number) => void;
  week: number;
  setWeek: (wk: number) => void;
  games: SeasonGame[];
  loading: boolean;
  favoriteTeamIds: string[];
  onOpenGame: (gameId: string) => void;
  onSelectTeam: (teamId: string) => void;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({
  seasonYear,
  seasonType,
  setSeasonType,
  week,
  setWeek,
  games,
  loading,
  favoriteTeamIds,
  onOpenGame,
  onSelectTeam,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'live' | 'favorites'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');

  const weeksList =
    seasonType === 1
      ? [
          { num: 1, label: 'HOF / Wk 1' },
          { num: 2, label: 'Pre Wk 2' },
          { num: 3, label: 'Pre Wk 3' },
          { num: 4, label: 'Pre Wk 4' },
        ]
      : seasonType === 3
      ? [
          { num: 1, label: 'Wild Card' },
          { num: 2, label: 'Divisional' },
          { num: 3, label: 'Conf. Champ' },
          { num: 4, label: 'Pro Bowl' },
          { num: 5, label: 'Super Bowl' },
        ]
      : [
          { num: 0, label: 'Full Season (Wk 1–18)' },
          ...Array.from({ length: 18 }, (_, i) => ({ num: i + 1, label: `Wk ${i + 1}` })),
        ];

  const filteredGames = games.filter((g) => {
    if (
      selectedTeamId !== 'ALL' &&
      g.homeTeam.id !== selectedTeamId &&
      g.awayTeam.id !== selectedTeamId
    ) {
      return false;
    }
    if (filterMode === 'live') return g.statusState === 'in';
    if (filterMode === 'favorites') {
      return (
        favoriteTeamIds.includes(g.homeTeam.id) || favoriteTeamIds.includes(g.awayTeam.id)
      );
    }
    return true;
  });

  const liveCount = games.filter((g) => g.statusState === 'in').length;

  const formatKickoff = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Season Type / Filter Controls */}
      <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {seasonYear} NFL Live Scoreboard & Weekly Schedule
              </h1>
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  {liveCount} LIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any matchup card to open the Full Game Center (Scoring Plays, Team Comparison, Player Box Scores, Drives & Win Probability).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Team Full Season Filter */}
            <select
              value={selectedTeamId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTeamId(val);
                if (val !== 'ALL' && seasonType === 2) {
                  setWeek(0);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white cursor-pointer"
            >
              <option value="ALL">All 32 Teams</option>
              {NFL_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.abbr} — {t.displayName} Full Schedule
                </option>
              ))}
            </select>

            {/* Season Type Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: 1, label: 'Preseason' },
                { id: 2, label: 'Regular Season' },
                { id: 3, label: 'Postseason' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setSeasonType(st.id);
                    setWeek(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    seasonType === st.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterMode === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({games.length})
              </button>
              <button
                onClick={() => setFilterMode('live')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterMode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live ({liveCount})
              </button>
              <button
                onClick={() => setFilterMode('favorites')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterMode === 'favorites'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Spotlight
              </button>
            </div>
          </div>
        </div>

        {/* Week Selector Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {weeksList.map((wk) => {
            const active = week === wk.num;
            return (
              <button
                key={wk.num}
                onClick={() => setWeek(wk.num)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold shrink-0 transition cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-emerald-950/50'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {wk.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scoreboard Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-[#0d121d] border border-slate-800/70 animate-pulse p-4"
            />
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-[#0d121d] border border-slate-800 rounded-2xl p-12 text-center space-y-2">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-base font-bold text-white">No Games Found</div>
          <p className="text-xs text-slate-400">
            Try switching the week, season type, or clearing the active filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGames.map((game) => {
            const isLive = game.statusState === 'in';
            const isPost = game.statusState === 'post';
            const isFavGame =
              favoriteTeamIds.includes(game.homeTeam.id) ||
              favoriteTeamIds.includes(game.awayTeam.id);

            const maxQuarters = Math.max(
              4,
              game.awayTeam.linescores.length,
              game.homeTeam.linescores.length
            );

            return (
              <div
                key={game.id}
                onClick={() => onOpenGame(game.id)}
                className={`group relative bg-[#0d121d] rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between ${
                  isLive
                    ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/30 hover:border-emerald-400'
                    : isFavGame
                    ? 'border-amber-500/40 hover:border-amber-400/70'
                    : 'border-slate-800/90 hover:border-slate-600'
                }`}
              >
                {/* Card Top Status Header */}
                <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>{game.shortDetail}</span>
                      </span>
                    ) : isPost ? (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                        {game.shortDetail}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{formatKickoff(game.date)}</span>
                      </span>
                    )}

                    {isFavGame && (
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    {game.broadcast && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                        <Tv className="w-2.5 h-2.5 text-cyan-400" />
                        {game.broadcast}
                      </span>
                    )}
                  </div>
                </div>

                {/* Teams & Linescore Body */}
                <div className="p-4 space-y-3">
                  {/* Linescore Column Headers */}
                  {(isLive || isPost) && (
                    <div className="flex items-center justify-end text-[10px] font-mono text-slate-500 pr-1">
                      <div className="flex items-center gap-2 mr-4">
                        {Array.from({ length: maxQuarters }).map((_, qIdx) => (
                          <span key={qIdx} className="w-5 text-center">
                            {qIdx < 4 ? `Q${qIdx + 1}` : `OT`}
                          </span>
                        ))}
                      </div>
                      <span className="w-8 text-right font-bold text-slate-400">TOT</span>
                    </div>
                  )}

                  {/* Away & Home Rows */}
                  {[
                    { side: 'away' as const, data: game.awayTeam },
                    { side: 'home' as const, data: game.homeTeam },
                  ].map(({ side, data }) => {
                    const hasPossession =
                      isLive && game.situation?.possession === data.id;
                    const isWinner = isPost && data.winner;

                    return (
                      <div
                        key={side}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={data.logo}
                            alt={data.abbr}
                            className="w-8 h-8 object-contain shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectTeam(data.id);
                                }}
                                className={`text-sm font-extrabold truncate hover:text-emerald-300 transition cursor-pointer ${
                                  isPost && !isWinner ? 'text-slate-400' : 'text-white'
                                }`}
                              >
                                {data.displayName}
                              </button>
                              {hasPossession && (
                                <span
                                  className="w-2 h-2 rounded-full bg-amber-400 animate-ping"
                                  title="Has Possession"
                                />
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {data.record} • {side === 'home' ? 'Home' : 'Away'}
                            </div>
                          </div>
                        </div>

                        {/* Quarter Linescores + Total Score */}
                        {isLive || isPost ? (
                          <div className="flex items-center pr-1 shrink-0 font-mono">
                            <div className="flex items-center gap-2 mr-4 text-xs text-slate-400">
                              {Array.from({ length: maxQuarters }).map((_, qIdx) => (
                                <span key={qIdx} className="w-5 text-center">
                                  {data.linescores[qIdx] !== undefined
                                    ? data.linescores[qIdx]
                                    : '-'}
                                </span>
                              ))}
                            </div>
                            <span
                              className={`w-8 text-right text-lg font-black ${
                                isWinner
                                  ? 'text-emerald-400'
                                  : isPost
                                  ? 'text-slate-400'
                                  : 'text-white'
                              }`}
                            >
                              {data.score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {data.abbr}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Live Down & Distance Situation Bar */}
                  {isLive && game.situation?.downDistanceText && (
                    <div
                      className={`mt-2 px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                        game.situation.isRedZone
                          ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                          : 'bg-slate-900 border-slate-800 text-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {game.situation.isRedZone && (
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{game.situation.downDistanceText}</span>
                      </div>
                      {game.situation.possessionText && (
                        <span className="text-slate-400">
                          at {game.situation.possessionText}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Top Performers Strip (Pass/Rush/Rec) */}
                  {(game.leaders?.passing || game.leaders?.rushing || game.leaders?.receiving) && (
                    <div className="pt-2.5 border-t border-slate-800/70 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                      {(['passing', 'rushing', 'receiving'] as const).map((cat) => {
                        const ldr = game.leaders?.[cat];
                        if (!ldr) return <div key={cat} />;
                        return (
                          <div
                            key={cat}
                            className="bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800/70 truncate"
                          >
                            <div className="uppercase text-[9px] text-slate-500">{cat}</div>
                            <div className="font-bold text-slate-200 truncate">
                              {ldr.name}{' '}
                              <span className="text-slate-500">({ldr.teamAbbr})</span>
                            </div>
                            <div className="text-emerald-400 truncate">{ldr.displayValue}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Footer: Venue / Odds + Open Game Center CTA */}
                <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 truncate">
                    {game.venue && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{game.venue}</span>
                      </span>
                    )}
                    {game.spread && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 border border-slate-800 shrink-0">
                        {game.spread}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition shrink-0">
                    <span>Game Center</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
