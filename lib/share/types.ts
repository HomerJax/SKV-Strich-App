export type SharePlayer = {
  id: string;
  name: string;
};

export type ShareTeam = {
  name: string;
  players: SharePlayer[];
};

export type ShareBranding = {
  appName: string;
  appTagline: string;
  appLogoUrl: string | null;
  clubName: string;
  clubCrestUrl: string | null;
};

export type LineupShareData = {
  title: string;
  subtitle: string;
  date: string;
  teamA: ShareTeam;
  teamB: ShareTeam;
  branding: ShareBranding;
};

export type ResultShareData = {
  title: string;
  subtitle: string;
  date: string;
  goalsA: string;
  goalsB: string;
  teamAName: string;
  teamBName: string;
  winnerLabel: string;
  winnerPhotoUrl: string | null;
  branding: ShareBranding;
};