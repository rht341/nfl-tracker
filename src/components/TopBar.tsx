import React from 'react';
import {
  Activity,
  BarChart3,
  Calculator,
  Calendar,
  RefreshCw,
  Search,
  Shield,
  Star,
  Trophy,
} from 'lucide-react';
import { SeasonGame, TeamStanding } from '../types/nfl.ts';
import { getTeamByIdOrAbbr } from '../utils/nflTeams.ts';

export type ActiveTab = 'standings' | 'scoreboard' | 'playoff-machine' | 'stats' | 'team-detail';

interface TopBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  seasonYear: number;
  setSeasonYear: (year: number) => void;
  availableSeasons: number[];
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
  isRefreshing: boolean;
  onForceRefresh: () => void;
  onOpenCommandPalette: () => void;
  favoriteTeamIds: string[];
  standings: TeamStanding[];
  regularSeasonGames: SeasonGame[];
  onSelectTeam: (teamId: string) => void;
  onOpenGame: (gameId: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  seasonYear,
  setSeasonYear,
  availableSeasons,
  autoRefresh,
  setAutoRefresh,
  isRefreshing,
  onForceRefresh,
  onOpenCommandPalette,
  favoriteTeamIds,
  standings,
  regularSeasonGames,
  onSelectTeam,
  onOpenGame,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'standings', label: 'Standings & Playoff Picture', icon: <Trophy className="w-4 h-4" /> },
    { id: 'scoreboard', label: 'Live Scoreboard', icon: <Calendar className="w-4 h-4" /> },
    { id: 'playoff-machine', label: 'Playoff Machine', icon: <Calculator className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#080b11]/95 backdrop-blur-md">
      {/* Main Broadcast Header Bar */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand + Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('standings')}
            className="flex items-center gap-2.5 group text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-950/50 border border-emerald-400/30">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-base text-white">GRIDIRON</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                  NFL {seasonYear}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Standings, Tiebreakers & Telemetry
              </p>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Controls: Command Palette, Season Selector, Live Poll, Refresh */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 text-xs text-slate-300 transition cursor-pointer"
            title="Quick Jump to Team, Player, or Week (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-slate-400">Jump to team / player...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-950 text-slate-400 rounded border border-slate-700">
              Ctrl K
            </kbd>
          </button>

          {/* Season Year Selector */}
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 px-2 py-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 mr-1.5 hidden sm:inline">
              Season
            </span>
            <select
              value={seasonYear}
              onChange={(e) => setSeasonYear(Number(e.target.value))}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            >
              {availableSeasons.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Live Polling Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle 30-second live game auto-refresh"
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>{autoRefresh ? 'LIVE 30s' : 'PAUSED'}</span>
          </button>

          {/* Force Refresh Button */}
          <button
            onClick={onForceRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition cursor-pointer disabled:opacity-50"
            title="Bypass SQLite cache and fetch fresh data from ESPN"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex lg:hidden items-center gap-1 px-4 pb-2 overflow-x-auto">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                active
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Favorite Teams Spotlight Strip */}
      {favoriteTeamIds.length > 0 && (
        <div className="bg-slate-950/90 border-t border-slate-800/70 px-4 sm:px-6 py-1.5">
          <div className="max-w-[1600px] mx-auto flex items-center gap-3 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-400 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Spotlight</span>
            </div>
            <div className="flex items-center gap-2.5">
              {favoriteTeamIds.map((tid) => {
                const tMeta = getTeamByIdOrAbbr(tid);
                const st = standings.find((s) => s.team.id === tMeta.id);
                const teamGames = regularSeasonGames.filter(
                  (g) => g.homeTeam.id === tMeta.id || g.awayTeam.id === tMeta.id
                );
                const liveOrNext =
                  teamGames.find((g) => g.statusState === 'in') ||
                  teamGames.find((g) => g.statusState === 'pre') ||
                  teamGames[teamGames.length - 1];

                return (
                  <div
                    key={tMeta.id}
                    className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-slate-800 hover:border-slate-700 transition shrink-0"
                  >
                    <button
                      onClick={() => onSelectTeam(tMeta.id)}
                      className="flex items-center gap-2 text-left cursor-pointer"
                    >
                      <img src={tMeta.logo} alt={tMeta.abbr} className="w-5 h-5 object-contain" />
                      <span className="text-xs font-bold text-white">{tMeta.abbr}</span>
                      {st && (
                        <span className="text-[11px] font-mono text-slate-300">
                          {st.wins}-{st.losses}
                          {st.ties > 0 ? `-${st.ties}` : ''}
                        </span>
                      )}
                      {st?.seed && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {tMeta.conference} #{st.seed}
                        </span>
                      )}
                    </button>

                    {liveOrNext && (
                      <button
                        onClick={() => onOpenGame(liveOrNext.id)}
                        className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 border-l border-slate-800 pl-2 cursor-pointer"
                        title="Open Game Center"
                      >
                        {liveOrNext.statusState === 'in' ? (
                          <span className="text-emerald-400 font-semibold">
                            LIVE: {liveOrNext.awayTeam.abbr} {liveOrNext.awayTeam.score} -{' '}
                            {liveOrNext.homeTeam.abbr} {liveOrNext.homeTeam.score}
                          </span>
                        ) : liveOrNext.statusState === 'post' ? (
                          <span>
                            Wk {liveOrNext.week}: {liveOrNext.awayTeam.abbr} {liveOrNext.awayTeam.score} @{' '}
                            {liveOrNext.homeTeam.abbr} {liveOrNext.homeTeam.score} (F)
                          </span>
                        ) : (
                          <span>
                            Next Wk {liveOrNext.week}:{' '}
                            {liveOrNext.homeTeam.id === tMeta.id
                              ? `vs ${liveOrNext.awayTeam.abbr}`
                              : `@ ${liveOrNext.homeTeam.abbr}`}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
