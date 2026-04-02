export type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

export type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export type Session = {
  id: number;
  date: string;
  season_id: number | null;
};

export type StandingRow = {
  player_id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  wins: number;
  sessions: number;
  mvps: number;
};

export type RankRow = StandingRow & {
  rank: number;
  deltaRank: number | null;
};