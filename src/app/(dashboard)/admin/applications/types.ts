export type ApplicationRow = {
  id: string;
  applicant: string | null;
  nationalities: string[];
  created_at: string;
  status: "pending" | "approved" | "rejected";
  plan: "free" | "pro" | "pro_plus";
  current_team_name: string | null;
  current_team_crest_url: string | null;
  current_team_country_code: string | null;
  proposed_team_name: string | null;
  proposed_team_country_code: string | null;
  free_agent: boolean;
  tasks: number;
  transfermarkt_url: string | null;
};

export type ColumnDef = {
  name: string;
  uid: keyof ApplicationRow | "actions" | "current_team" | "id";
  sortable?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};
