import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Search, Shield, Trophy, User, X } from 'lucide-react';
import { NFL_TEAMS } from '../utils/nflTeams.ts';
import { PlayerStatLeader } from '../types/nfl.ts';
import { ActiveTab } from './TopBar.tsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectWeek: (week: number) => void;
  players: PlayerStatLeader[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTeam,
  onSelectTab,
  onSelectWeek,
  players,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedTeams = NFL_TEAMS.filter(
      (t) =>
        !q ||
        t.displayName.toLowerCase().includes(q) ||
        t.abbr.toLowerCase().includes(q) ||
        t.fullDivision.toLowerCase().includes(q)
    ).slice(0, 12);

    const uniquePlayers = Array.from(new Map(players.map((p) => [p.id, p])).values());
    const matchedPlayers = q
      ? uniquePlayers
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.teamAbbr.toLowerCase().includes(q) ||
              p.position.toLowerCase().includes(q)
          )
          .slice(0, 8)
      : [];

    const weeks = Array.from({ length: 18 }, (_, i) => i + 1).filter(
      (w) => q && (`week ${w}`.includes(q) || `wk ${w}`.includes(q) || q === String(w))
    );

    return { matchedTeams, matchedPlayers, weeks };
  }, [query, players]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0e131f] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-5 h-5 text-emerald-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any NFL team (e.g. 'KC', 'Lions', 'AFC North'), player, or 'Week 12'..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Views */}
          {!query && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { tab: 'standings' as ActiveTab, label: 'Standings & Seeds' },
                  { tab: 'scoreboard' as ActiveTab, label: 'Live Scoreboard' },
                  { tab: 'playoff-machine' as ActiveTab, label: 'Playoff Machine' },
                  { tab: 'stats' as ActiveTab, label: 'Stats & Quadrant' },
                ].map((v) => (
                  <button
                    key={v.tab}
                    onClick={() => {
                      onSelectTab(v.tab);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
                  >
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weeks */}
          {results.weeks.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Jump to Schedule Week
              </div>
              <div className="flex flex-wrap gap-2">
                {results.weeks.map((wk) => (
                  <button
                    key={wk}
                    onClick={() => {
                      onSelectWeek(wk);
                      onSelectTab('scoreboard');
                      onClose();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-500/20 border border-slate-700 text-xs font-mono text-emerald-300 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Week {wk} Scoreboard</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NFL Teams */}
          {results.matchedTeams.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                NFL Franchises ({results.matchedTeams.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {results.matchedTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      onSelectTeam(team.id);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/80 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={team.logo} alt={team.abbr} className="w-6 h-6 object-contain" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                          {team.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{team.fullDivision}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {team.abbr}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Players */}
          {results.matchedPlayers.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 mb-1.5">
                Stat Leaders
              </div>
              <div className="space-y-1">
                {results.matchedPlayers.map((p) => (
                  <button
                    key={`${p.category}-${p.id}`}
                    onClick={() => {
                      onSelectTeam(p.teamId);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {p.headshot ? (
                        <img
                          src={p.headshot}
                          alt={p.name}
                          className="w-7 h-7 rounded-full object-cover bg-slate-800"
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {p.teamAbbr} • {p.position}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 font-bold">
                      {p.primaryStatDisplay} {p.primaryStatLabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.matchedTeams.length === 0 && results.matchedPlayers.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              No matching NFL teams, players, or weeks found for "{query}".
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click any team to open full Roster, Schedule & Injury Deep-Dive</span>
          </div>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
