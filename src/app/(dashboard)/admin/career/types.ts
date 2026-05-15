export type CareerItem = {
    id: string;
    status: "pending" | "accepted" | "rejected";
    club: string;
    division: string | null;
    start_year: number | null;
    end_year: number | null;
    team_id: string | null;
    team_name: string;
    crest_url: string | null;
    country_code: string | null;
    team_status: "pending" | "approved" | "rejected" | null;
  };

  export type CareerRow = {
    id: string; // player_application id
    applicant: string | null;
    status: "pending" | "waiting" | "approved";
    created_at: string;
    current_team_name: string | null;
    current_team_crest_url: string | null;
    current_team_country_code: string | null;
    nationalities: string[];
    links: string[];
    items: CareerItem[];
  };
  
  export type ColumnDef = {
    name: string;
    uid: keyof CareerRow | "current_team" | "country" | "actions" | "id";
    sortable?: boolean;
    align?: "start" | "center" | "end";
    className?: string;
  };