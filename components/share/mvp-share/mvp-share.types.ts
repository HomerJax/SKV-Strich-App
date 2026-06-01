export type RouteContext = {
  params: Promise<{ id: string }>;
};

export type ShareMode = "winner" | "team";
export type SharePerspective = "self" | "team";

export type VoteRow = {
  voted_player_id: number;
};

export type PlayerRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  mvp_count: number | null;
};

export type SessionRow = {
  id: number;
  club_id: string;
  date: string;
};

export type SessionPlayerRow = {
  player_id: number;
  players: PlayerRow | PlayerRow[] | null;
};

export type ClubRow = {
  display_name: string | null;
  logo_path: string | null;
};

export type LeaderboardEntry = {
  playerId: number;
  name: string;
  votes: number;
  previous: number;
  current: number;
  badgeLabel: string;
  earnedBadgeText: string;
};

export type MvpShareImageProps = {
  mode: ShareMode;
  sharePerspective?: SharePerspective;
  strikrLogoUrl: string;
  clubLogoUrl: string | null;
  badgeImageUrl: string;
  clubName: string;
  sessionDateLabel: string;
  winner: LeaderboardEntry;
  winners?: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
};