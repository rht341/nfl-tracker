export type Conference = 'AFC' | 'NFC';
export type Division = 'East' | 'North' | 'South' | 'West';
export type FullDivision = `${Conference} ${Division}`;

export interface NFLTeamStatic {
  id: string;
  abbr: string;
  name: string;
  location: string;
  displayName: string;
  conference: Conference;
  division: Division;
  fullDivision: FullDivision;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
}

export interface TeamStanding {
  team: NFLTeamStatic;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  homeRecord: string;
  awayRecord: string;
  divWins: number;
  divLosses: number;
  divTies: number;
  divWinPct: number;
  divRecord: string;
  confWins: number;
  confLosses: number;
  confTies: number;
  confWinPct: number;
  confRecord: string;
  streak: string;
  sov: number;
  sos: number;
  seed?: number;
  divisionRank?: number;
  clinched?: string;
  tiebreakerExplanation?: string;
  last5?: ('W' | 'L' | 'T')[];
}

export interface SeasonGame {
  id: string;
  seasonYear: number;
  seasonType: number; // 1 = Pre, 2 = Reg, 3 = Post
  week: number;
  weekLabel: string;
  date: string;
  statusState: 'pre' | 'in' | 'post';
  statusDetail: string;
  shortDetail: string;
  period: number;
  clock: string;
  venue: string;
  broadcast: string;
  spread?: string;
  overUnder?: string;
  neutralSite: boolean;
  homeTeam: {
    id: string;
    abbr: string;
    displayName: string;
    logo: string;
    primaryColor: string;
    score: number;
    record: string;
    linescores: number[];
    winner?: boolean;
  };
  awayTeam: {
    id: string;
    abbr: string;
    displayName: string;
    logo: string;
    primaryColor: string;
    score: number;
    record: string;
    linescores: number[];
    winner?: boolean;
  };
  situation?: {
    possession?: string; // team id
    downDistanceText?: string;
    possessionText?: string;
    isRedZone?: boolean;
  };
  leaders?: {
    passing?: { name: string; teamAbbr: string; displayValue: string; headshot?: string };
    rushing?: { name: string; teamAbbr: string; displayValue: string; headshot?: string };
    receiving?: { name: string; teamAbbr: string; displayValue: string; headshot?: string };
  };
}

export interface ScoringPlay {
  id: string;
  period: number;
  clock: string;
  type: string;
  text: string;
  awayScore: number;
  homeScore: number;
  teamAbbr: string;
  teamLogo: string;
}

export interface BoxScoreCategory {
  name: string;
  labels: string[];
  descriptions: string[];
  athletes: {
    id: string;
    name: string;
    jersey: string;
    position: string;
    headshot?: string;
    stats: string[];
  }[];
  totals: string[];
}

export interface DriveItem {
  id: string;
  description: string;
  teamAbbr: string;
  teamLogo: string;
  result: string;
  yards: number;
  plays: number;
  timeElapsed: string;
  isScore: boolean;
  startText: string;
  endText: string;
  playList: {
    id: string;
    clock: string;
    period: number;
    text: string;
    downDistance: string;
    scoringPlay: boolean;
  }[];
}

export interface GameCenterDetail {
  game: SeasonGame;
  scoringPlays: ScoringPlay[];
  teamStats: {
    label: string;
    awayValue: string;
    homeValue: string;
    awayNumeric: number;
    homeNumeric: number;
  }[];
  boxScore: {
    away: BoxScoreCategory[];
    home: BoxScoreCategory[];
  };
  drives: DriveItem[];
  winProbability: {
    playId: string;
    homeWinPct: number;
    text: string;
  }[];
  gameInfo: {
    venue: string;
    cityState: string;
    attendance?: number;
    weather?: string;
    officials?: string[];
  };
}

export interface TeamSeasonStatRow {
  team: NFLTeamStatic;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  ppg: number;
  papg: number;
  pointDiffPerGame: number;
  totalYpg: number;
  passYpg: number;
  rushYpg: number;
  yardsPerPlay: number;
  defTotalYpg: number;
  defPassYpg: number;
  defRushYpg: number;
  thirdDownPct: number;
  redZonePct: number;
  turnoversLost: number;
  turnoversGained: number;
  turnoverDiff: number;
  sacks: number;
}

export interface PlayerStatLeader {
  id: string;
  name: string;
  shortName: string;
  position: string;
  jersey: string;
  teamId: string;
  teamAbbr: string;
  teamColor: string;
  teamLogo: string;
  headshot: string;
  category: 'passing' | 'rushing' | 'receiving' | 'defense' | 'kicking';
  primaryStatLabel: string;
  primaryStatValue: number;
  primaryStatDisplay: string;
  stats: Record<string, string | number>;
}

export interface TeamDeepDiveData {
  team: NFLTeamStatic;
  standing: TeamStanding;
  teamStats: TeamSeasonStatRow;
  schedule: SeasonGame[];
  roster: {
    id: string;
    fullName: string;
    jersey: string;
    position: string;
    group: 'Offense' | 'Defense' | 'Special Teams';
    age?: number;
    height?: string;
    weight?: string;
    experience?: number;
    college?: string;
    headshot?: string;
    status?: string;
    injuryStatus?: string;
    injuryComment?: string;
  }[];
  injuries: {
    athleteId: string;
    name: string;
    position: string;
    jersey: string;
    headshot?: string;
    status: string;
    type: string;
    detail: string;
    date: string;
  }[];
}

export interface SavedPlayoffScenario {
  id: string;
  name: string;
  seasonYear: number;
  picks: Record<string, 'home' | 'away' | 'tie'>; // gameId -> outcome
  createdAt: number;
  updatedAt: number;
}

export interface WatchlistPlayer {
  athleteId: string;
  fullName: string;
  position: string;
  teamAbbr: string;
  headshotUrl: string;
  notes: string;
  createdAt: number;
}
