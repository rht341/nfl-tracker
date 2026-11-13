import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Calculator,
  Check,
  FolderOpen,
  Info,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  Conference,
  SavedPlayoffScenario,
  SeasonGame,
  TeamStanding,
} from '../types/nfl.ts';
import { computeStandingsFromGames } from '../utils/tiebreaker.ts';
import { NFL_TEAMS } from '../utils/nflTeams.ts';

interface PlayoffMachineProps {
  seasonYear: number;
  regularSeasonGames: SeasonGame[];
  baselineStandings: TeamStanding[];
  savedScenarios: SavedPlayoffScenario[];
  onSaveScenario: (name: string, picks: Record<string, 'home' | 'away' | 'tie'>, id?: string) => Promise<void>;
  onDeleteScenario: (id: string) => Promise<void>;
  onSelectTeam: (teamId: string) => void;
}

export const PlayoffMachine: React.FC<PlayoffMachineProps> = ({
  seasonYear,
  regularSeasonGames,
  baselineStandings,
  savedScenarios,
  onSaveScenario,
  onDeleteScenario,
  onSelectTeam,
}) => {
  const [picks, setPicks] = useState<Record<string, 'home' | 'away' | 'tie'>>({});
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [scenarioName, setScenarioName] = useState<string>('');
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Default to the earliest week with unplayed games (or Week 18 if season is complete)
  useEffect(() => {
    const firstUnplayed = regularSeasonGames.find((g) => g.statusState !== 'post');
    if (firstUnplayed) {
      setSelectedWeek(firstUnplayed.week);
    } else if (regularSeasonGames.length > 0) {
      const maxWk = Math.max(...regularSeasonGames.map((g) => g.week));
      setSelectedWeek(maxWk || 18);
    }
    setPicks({});
    setActiveScenarioId(undefined);
  }, [seasonYear, regularSeasonGames]);

  const baselineByTeamId = useMemo(() => {
    return Object.fromEntries(baselineStandings.map((s) => [s.team.id, s]));
  }, [baselineStandings]);

  // Dynamically compute full NFL standings + tiebreakers from real games + user picks
  const simulatedStandings = useMemo(() => {
    return computeStandingsFromGames(regularSeasonGames, picks, baselineStandings);
  }, [regularSeasonGames, picks, baselineStandings]);

  const visibleGames = useMemo(() => {
    if (selectedTeamFilter !== 'ALL') {
      return regularSeasonGames
        .filter(
          (g) =>
            g.homeTeam.id === selectedTeamFilter || g.awayTeam.id === selectedTeamFilter
        )
        .sort((a, b) => a.week - b.week);
    }
    return regularSeasonGames.filter((g) => g.week === selectedWeek);
  }, [regularSeasonGames, selectedWeek, selectedTeamFilter]);

  const handlePick = (gameId: string, choice: 'home' | 'away' | 'tie') => {
    setPicks((prev) => {
      const next = { ...prev };
      if (next[gameId] === choice) {
        delete next[gameId];
      } else {
        next[gameId] = choice;
      }
      return next;
    });
  };

  // Auto-fill helpers for unplayed games (or all games in current view if season is completed)
  const applyQuickFill = (mode: 'winPct' | 'pointDiff' | 'home') => {
    const unplayed = regularSeasonGames.filter((g) => g.statusState !== 'post');
    const targetGames = unplayed.length > 0 ? unplayed : visibleGames;

    const next = { ...picks };
    for (const g of targetGames) {
      const homeSt = baselineByTeamId[g.homeTeam.id];
      const awaySt = baselineByTeamId[g.awayTeam.id];
      if (mode === 'home') {
        next[g.id] = 'home';
      } else if (mode === 'winPct') {
        const hPct = homeSt?.winPct ?? 0.5;
        const aPct = awaySt?.winPct ?? 0.5;
        next[g.id] = hPct >= aPct ? 'home' : 'away';
      } else if (mode === 'pointDiff') {
        const hDiff = homeSt?.pointDiff ?? 0;
        const aDiff = awaySt?.pointDiff ?? 0;
        next[g.id] = hDiff >= aDiff ? 'home' : 'away';
      }
    }
    setPicks(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) return;
    setSaving(true);
    try {
      await onSaveScenario(scenarioName.trim(), picks, activeScenarioId);
      setScenarioName('');
    } finally {
      setSaving(false);
    }
  };

  const loadScenario = (sc: SavedPlayoffScenario) => {
    setPicks(sc.picks || {});
    setScenarioName(sc.name);
    setActiveScenarioId(sc.id);
  };

  const pickCount = Object.keys(picks).length;

  return (
    <div className="space-y-6">
      {/* Top Control Deck */}
      <div className="bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {seasonYear} NFL Playoff Machine & Scenario Simulator
              </h1>
              {pickCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                  {pickCount} Simulated {pickCount === 1 ? 'Game' : 'Games'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Pick game winners or ties below to dynamically recompute Division Champions, Wild Card seeds, SOV/SOS, and multi-team NFL tiebreakers.
            </p>
          </div>

          {/* Quick-Fill Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1 mr-1">
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              Auto-Fill:
            </span>
            <button
              onClick={() => applyQuickFill('winPct')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              By Win %
            </button>
            <button
              onClick={() => applyQuickFill('pointDiff')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              By Point Diff
            </button>
            <button
              onClick={() => applyQuickFill('home')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              All Home Teams
            </button>
            <button
              onClick={() => {
                setPicks({});
                setActiveScenarioId(undefined);
              }}
              disabled={pickCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-xs font-semibold text-rose-200 transition cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ({pickCount})</span>
            </button>
          </div>
        </div>

        {/* Save / Load SQLite Scenarios Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSave} className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Name this scenario (e.g. 'NFC North Chaos')..."
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-56 sm:w-64"
            />
            <button
              type="submit"
              disabled={saving || !scenarioName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:brightness-110 transition cursor-pointer disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Scenario</span>
            </button>
          </form>

          {/* Saved Scenario Pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              Saved ({savedScenarios.length}):
            </span>
            {savedScenarios.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No saved scenarios for {seasonYear} yet</span>
            ) : (
              savedScenarios.map((sc) => (
                <div
                  key={sc.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shrink-0 ${
                    activeScenarioId === sc.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <button
                    onClick={() => loadScenario(sc)}
                    className="font-semibold hover:text-white cursor-pointer"
                  >
                    {sc.name}{' '}
                    <span className="text-[10px] font-mono text-slate-400">
                      ({Object.keys(sc.picks || {}).length} picks)
                    </span>
                  </button>
                  <button
                    onClick={() => onDeleteScenario(sc.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                    title="Delete Scenario"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Live AFC/NFC Seedings (Left 7 cols) + Interactive Game Picker (Right 5 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Live Simulated AFC & NFC Playoff Standings with Seed Deltas */}
        <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['AFC', 'NFC'] as Conference[]).map((conf) => {
            const confRows = simulatedStandings
              .filter((s) => s.team.conference === conf)
              .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));

            return (
              <div
                key={conf}
                className="bg-[#0d121d] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl"
              >
                <div
                  className={`px-4 py-2.5 border-b border-slate-800 flex items-center justify-between ${
                    conf === 'AFC' ? 'bg-rose-950/25' : 'bg-blue-950/25'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    {conf} Simulated Seeding
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Top 7 Qualify
                  </span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {confRows.map((row) => {
                    const seed = row.seed ?? 99;
                    const base = baselineByTeamId[row.team.id];
                    const baseSeed = base?.seed ?? seed;
                    const seedDelta = baseSeed - seed; // positive = moved UP in seeding
                    const enteredPlayoffs = baseSeed > 7 && seed <= 7;
                    const droppedOut = baseSeed <= 7 && seed > 7;

                    return (
                      <React.Fragment key={row.team.id}>
                        <div
                          className={`px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                            seed <= 7 ? 'bg-emerald-950/10' : 'opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-6 h-5 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                                seed === 1
                                  ? 'bg-amber-500 text-slate-950'
                                  : seed <= 4
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : seed <= 7
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-slate-900 text-slate-500'
                              }`}
                            >
                              #{seed}
                            </span>

                            <img
                              src={row.team.logo}
                              alt={row.team.abbr}
                              className="w-5 h-5 object-contain shrink-0"
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => onSelectTeam(row.team.id)}
                                  className="font-bold text-white hover:text-emerald-300 truncate cursor-pointer"
                                >
                                  {row.team.abbr}
                                </button>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {row.team.division} #{row.divisionRank}
                                </span>
                                {row.tiebreakerExplanation && (
                                  <span
                                    className="text-[9px] font-mono px-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 cursor-help"
                                    title={row.tiebreakerExplanation}
                                  >
                                    TB
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 font-mono">
                            {/* Seed Movement Delta Badge */}
                            {enteredPlayoffs ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-black">
                                NEW IN
                              </span>
                            ) : droppedOut ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 text-[9px] font-bold">
                                OUT
                              </span>
                            ) : seedDelta > 0 ? (
                              <span className="inline-flex items-center text-[10px] text-emerald-400 font-bold">
                                <ArrowUp className="w-3 h-3" />+{seedDelta}
                              </span>
                            ) : seedDelta < 0 ? (
                              <span className="inline-flex items-center text-[10px] text-rose-400 font-bold">
                                <ArrowDown className="w-3 h-3" />
                                {seedDelta}
                              </span>
                            ) : null}

                            <div className="text-right w-14">
                              <div className="font-bold text-slate-100">
                                {row.wins}-{row.losses}
                                {row.ties > 0 ? `-${row.ties}` : ''}
                              </div>
                              <div className="text-[9px] text-slate-500">
                                Conf {row.confRecord}
                              </div>
                            </div>
                          </div>
                        </div>

                        {seed === 4 && (
                          <div className="px-3 py-1 bg-emerald-950/30 text-[9px] font-mono uppercase tracking-wider text-emerald-300">
                            ▲ Division Champions • ▼ Wild Card
                          </div>
                        )}
                        {seed === 7 && (
                          <div className="px-3 py-1 bg-rose-950/30 text-[9px] font-mono uppercase tracking-wider text-rose-300">
                            ▲ Playoff Cutline (#7) • ▼ Eliminated / In Hunt
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 5 Cols: Interactive Game Picker Deck */}
        <div className="xl:col-span-5 bg-[#0d121d] border border-slate-800/90 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Matchup Outcome Picker
              </h2>
            </div>

            {/* Filter by Team Schedule */}
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 cursor-pointer"
            >
              <option value="ALL">Filter by Week (All Teams)</option>
              {NFL_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.abbr} — {t.displayName} Schedule
                </option>
              ))}
            </select>
          </div>

          {/* Week Pills when viewing by week */}
          {selectedTeamFilter === 'ALL' && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((wk) => {
                const wkGames = regularSeasonGames.filter((g) => g.week === wk);
                const pickedInWk = wkGames.filter((g) => picks[g.id]).length;
                return (
                  <button
                    key={wk}
                    onClick={() => setSelectedWeek(wk)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0 transition cursor-pointer ${
                      selectedWeek === wk
                        ? 'bg-emerald-500 text-slate-950'
                        : pickedInWk > 0
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    W{wk}
                  </button>
                );
              })}
            </div>
          )}

          {/* Matchup Cards */}
          <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
            {visibleGames.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No regular season matchups found for this selection.
              </div>
            ) : (
              visibleGames.map((g) => {
                const userPick = picks[g.id];
                const isFinal = g.statusState === 'post';

                const actualOutcome: 'home' | 'away' | 'tie' | null = isFinal
                  ? g.homeTeam.score > g.awayTeam.score
                    ? 'home'
                    : g.awayTeam.score > g.homeTeam.score
                    ? 'away'
                    : 'tie'
                  : null;

                const activeChoice = userPick || actualOutcome;

                return (
                  <div
                    key={g.id}
                    className={`p-3 rounded-xl border transition ${
                      userPick
                        ? 'bg-emerald-950/15 border-emerald-500/50'
                        : 'bg-slate-950/70 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2">
                      <span>
                        Week {g.week} • {g.awayTeam.abbr} @ {g.homeTeam.abbr}
                      </span>
                      <div className="flex items-center gap-2">
                        {isFinal && !userPick && (
                          <span className="text-slate-500">
                            Actual: {g.awayTeam.abbr} {g.awayTeam.score} - {g.homeTeam.abbr}{' '}
                            {g.homeTeam.score}
                          </span>
                        )}
                        {userPick && (
                          <span className="text-emerald-400 font-bold">
                            Simulated Override
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3-Button Toggle: Away Win | Tie | Home Win */}
                    <div className="grid grid-cols-7 gap-2 items-center">
                      {/* Away Button */}
                      <button
                        onClick={() => handlePick(g.id, 'away')}
                        className={`col-span-3 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          activeChoice === 'away'
                            ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-sm'
                            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={g.awayTeam.logo}
                            alt={g.awayTeam.abbr}
                            className="w-5 h-5 object-contain"
                          />
                          <span>{g.awayTeam.abbr}</span>
                        </div>
                        {activeChoice === 'away' && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      {/* Tie Button */}
                      <button
                        onClick={() => handlePick(g.id, 'tie')}
                        className={`col-span-1 py-2 rounded-lg border text-[10px] font-mono font-bold text-center transition cursor-pointer ${
                          activeChoice === 'tie'
                            ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-500'
                        }`}
                      >
                        TIE
                      </button>

                      {/* Home Button */}
                      <button
                        onClick={() => handlePick(g.id, 'home')}
                        className={`col-span-3 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          activeChoice === 'home'
                            ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-sm'
                            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        {activeChoice === 'home' && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <span>{g.homeTeam.abbr}</span>
                          <img
                            src={g.homeTeam.logo}
                            alt={g.homeTeam.abbr}
                            className="w-5 h-5 object-contain"
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              You can even override already-completed games to explore historical "what-if" playoff scenarios!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
