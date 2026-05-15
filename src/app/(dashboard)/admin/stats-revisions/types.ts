export type StatsRevisionTeam = {
  id: string | null;
  name: string | null;
  crestUrl: string | null;
  countryCode: string | null;
};

export type StatsRevisionItem = {
  id: string;
  originalStatId: string | null;
  season: string;
  competition: string | null;
  team: string | null;
  matches: number | null;
  starts: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
  yellowCards: number | null;
  redCards: number | null;
  careerItemId: string | null;
  crestUrl?: string | null;
};

export type StatsRevisionRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  submittedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  player: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    nationalities: string[];
    currentClub: string | null;
    currentTeam: StatsRevisionTeam;
    transfermarktUrl: string | null;
  };
  submittedBy: {
    id: string;
    name: string | null;
  } | null;
  stats: StatsRevisionItem[];
};
