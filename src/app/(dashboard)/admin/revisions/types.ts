export type RevisionTeam = {
  id: string | null;
  name: string | null;
  crestUrl: string | null;
  countryCode: string | null;
};

export type RevisionProposedTeam = {
  id: string;
  name: string | null;
  countryCode: string | null;
  countryName: string | null;
  transfermarktUrl: string | null;
};

export type RevisionItem = {
  id: string;
  originalItemId: string | null;
  club: string;
  division: string | null;
  startYear: number | null;
  endYear: number | null;
  team: RevisionTeam;
  proposedTeam: RevisionProposedTeam | null;
};

export type RevisionRequest = {
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
    currentTeam: RevisionTeam;
  };
  submittedBy: {
    id: string;
    name: string | null;
  } | null;
  items: RevisionItem[];
};

