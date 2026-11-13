import React, { useCallback, useEffect, useState } from 'react';
import { ActiveTab, TopBar } from './components/TopBar.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { StandingsView } from './components/StandingsView.tsx';
import { ScoreboardView } from './components/ScoreboardView.tsx';
import { GameCenterModal } from './components/GameCenterModal.tsx';
import { PlayoffMachine } from './components/PlayoffMachine.tsx';
import { StatsView } from './components/StatsView.tsx';
import { TeamDetailView } from './components/TeamDetailView.tsx';
import {
  PlayerStatLeader,
  SavedPlayoffScenario,
  SeasonGame,
  TeamSeasonStatRow,
  TeamStanding,
  WatchlistPlayer,
} from './types/nfl.ts';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('standings');
  const [seasonYear, setSeasonYear] = useState<number>(2026);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([
    2026, 2025, 2024, 2023, 2022, 2021, 2020,
  ]);
  const [seasonType, setSeasonType] = useState<number>(2);
  const [week, setWeek] = useState<number>(10);

  // Core NFL Datasets
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [regularSeasonGames, setRegularSeasonGames] = useState<SeasonGame[]>([]);
  const [weeklyGames, setWeeklyGames] = useState<SeasonGame[]>([]);
  const [teamStats, setTeamStats] = useState<TeamSeasonStatRow[]>([]);
  const [playerLeaders, setPlayerLeaders] = useState<PlayerStatLeader[]>([]);

  // User SQLite State
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistPlayer[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedPlayoffScenario[]>([]);

  // UI & Modal State
  const [selectedTeamId, setSelectedTeamId] = useState<string>('12');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingScoreboard, setLoadingScoreboard] = useState<boolean>(false);

  // 1. Initial Meta Detection (Current NFL Season, Week, SeasonType)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/meta');
        if (res.ok) {
          const meta = await res.json();
          if (meta.currentSeason) setSeasonYear(meta.currentSeason);
          if (meta.currentSeasonType) setSeasonType(meta.currentSeasonType);
          if (meta.currentWeek) setWeek(meta.currentWeek);
          if (Array.isArray(meta.availableSeasons)) {
            setAvailableSeasons(meta.availableSeasons);
          }
        }
      } catch {
        // Keep defaults
      }
    })();
  }, []);

  // 2. Load User State from SQLite
  const loadUserState = useCallback(async (yr: number) => {
    try {
      const res = await fetch(`/api/user/state?season=${yr}`);
      if (res.ok) {
        const data = await res.json();
        setFavoriteTeamIds((data.favorites || []).map((f: any) => String(f.teamId)));
        setWatchlist(data.watchlist || []);
        setSavedScenarios(data.scenarios || []);
      }
    } catch {
      // Ignore error
    }
  }, []);

  // 3. Load Season Standings, Full Regular Season Schedule, Team Stats & Player Leaders
  const loadSeasonData = useCallback(async (yr: number, force = false) => {
    setIsRefreshing(true);
    try {
      const q = `season=${yr}${force ? '&force=1' : ''}`;
      const [stRes, tsRes, plRes] = await Promise.all([
        fetch(`/api/standings?${q}`),
        fetch(`/api/stats/teams?${q}`),
        fetch(`/api/stats/players?${q}`),
      ]);

      if (stRes.ok) {
        const stJson = await stRes.json();
        setStandings(stJson.standings || []);
        setRegularSeasonGames(stJson.regularSeasonGames || []);
      }
      if (tsRes.ok) {
        const tsJson = await tsRes.json();
        setTeamStats(tsJson.teams || []);
      }
      if (plRes.ok) {
        const plJson = await plRes.json();
        setPlayerLeaders(plJson.leaders || []);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 4. Load Weekly Scoreboard
  const loadScoreboard = useCallback(
    async (yr: number, sType: number, wk: number, force = false, silent = false) => {
      if (!silent) setLoadingScoreboard(true);
      try {
        const res = await fetch(
          `/api/scoreboard?season=${yr}&type=${sType}&week=${wk}${force ? '&force=1' : ''}`
        );
        if (res.ok) {
          const data = await res.json();
          setWeeklyGames(data.games || []);
        }
      } finally {
        if (!silent) setLoadingScoreboard(false);
      }
    },
    []
  );

  useEffect(() => {
    loadUserState(seasonYear);
    loadSeasonData(seasonYear, false);
  }, [seasonYear, loadUserState, loadSeasonData]);

  useEffect(() => {
    loadScoreboard(seasonYear, seasonType, week, false, false);
  }, [seasonYear, seasonType, week, loadScoreboard]);

  // 5. Automatic 30-second Live Polling
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadScoreboard(seasonYear, seasonType, week, false, true);
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, seasonYear, seasonType, week, loadScoreboard]);

  // 6. Global Keyboard Shortcuts (Ctrl+K or '/' to open Command Palette, Esc to close modals)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        setIsCommandOpen(true);
      } else if (e.key === 'Escape') {
        setIsCommandOpen(false);
        setActiveGameId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Handlers for User SQLite Mutations
  const handleToggleFavorite = async (teamId: string, teamAbbr: string) => {
    const res = await fetch('/api/user/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, teamAbbr }),
    });
    if (res.ok) {
      const data = await res.json();
      setFavoriteTeamIds((data.favorites || []).map((f: any) => String(f.teamId)));
    }
  };

  const handleAddWatchlist = async (player: Omit<WatchlistPlayer, 'createdAt'>) => {
    const res = await fetch('/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(player),
    });
    if (res.ok) {
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    }
  };

  const handleRemoveWatchlist = async (athleteId: string) => {
    const res = await fetch(`/api/user/watchlist/${athleteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    }
  };

  const handleSaveScenario = async (
    name: string,
    picks: Record<string, 'home' | 'away' | 'tie'>,
    id?: string
  ) => {
    const res = await fetch('/api/user/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, seasonYear, picks }),
    });
    if (res.ok) {
      const data = await res.json();
      setSavedScenarios(data.scenarios || []);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    const res = await fetch(`/api/user/scenarios/${id}?season=${seasonYear}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      setSavedScenarios(data.scenarios || []);
    }
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('team-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleForceRefresh = () => {
    loadSeasonData(seasonYear, true);
    loadScoreboard(seasonYear, seasonType, week, true, false);
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col">
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        seasonYear={seasonYear}
        setSeasonYear={setSeasonYear}
        availableSeasons={availableSeasons}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        isRefreshing={isRefreshing}
        onForceRefresh={handleForceRefresh}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        favoriteTeamIds={favoriteTeamIds}
        standings={standings}
        regularSeasonGames={regularSeasonGames}
        onSelectTeam={handleSelectTeam}
        onOpenGame={(gid) => setActiveGameId(gid)}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'standings' && (
          <StandingsView
            standings={standings}
            seasonYear={seasonYear}
            favoriteTeamIds={favoriteTeamIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectTeam={handleSelectTeam}
            onOpenPlayoffMachine={() => setActiveTab('playoff-machine')}
          />
        )}

        {activeTab === 'scoreboard' && (
          <ScoreboardView
            seasonYear={seasonYear}
            seasonType={seasonType}
            setSeasonType={setSeasonType}
            week={week}
            setWeek={setWeek}
            games={weeklyGames}
            loading={loadingScoreboard}
            favoriteTeamIds={favoriteTeamIds}
            onOpenGame={(gid) => setActiveGameId(gid)}
            onSelectTeam={handleSelectTeam}
          />
        )}

        {activeTab === 'playoff-machine' && (
          <PlayoffMachine
            seasonYear={seasonYear}
            regularSeasonGames={regularSeasonGames}
            baselineStandings={standings}
            savedScenarios={savedScenarios}
            onSaveScenario={handleSaveScenario}
            onDeleteScenario={handleDeleteScenario}
            onSelectTeam={handleSelectTeam}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            seasonYear={seasonYear}
            teamStats={teamStats}
            playerLeaders={playerLeaders}
            watchlist={watchlist}
            favoriteTeamIds={favoriteTeamIds}
            onAddWatchlist={handleAddWatchlist}
            onRemoveWatchlist={handleRemoveWatchlist}
            onSelectTeam={handleSelectTeam}
          />
        )}

        {activeTab === 'team-detail' && (
          <TeamDetailView
            teamId={selectedTeamId}
            seasonYear={seasonYear}
            favoriteTeamIds={favoriteTeamIds}
            watchlist={watchlist}
            onToggleFavorite={handleToggleFavorite}
            onAddWatchlist={handleAddWatchlist}
            onRemoveWatchlist={handleRemoveWatchlist}
            onSelectTeam={handleSelectTeam}
            onOpenGame={(gid) => setActiveGameId(gid)}
            onBack={() => setActiveTab('standings')}
          />
        )}
      </main>

      {/* Modals */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectTeam={handleSelectTeam}
        onSelectTab={setActiveTab}
        onSelectWeek={(wk) => {
          setSeasonType(2);
          setWeek(wk);
        }}
        players={playerLeaders}
      />

      <GameCenterModal
        gameId={activeGameId}
        onClose={() => setActiveGameId(null)}
        onSelectTeam={handleSelectTeam}
      />
    </div>
  );
};

export default App;
