export type AgencyAgentRow = {
  user_profile_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  contact_email: string | null;
  joined_at: string;
};

export type AgencyRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  headquarters: string | null;
  operative_countries: string[];
  foundation_year: number | null;
  is_approved: boolean;
  contact_email: string | null;
  website_url: string | null;
  created_at: string;
  agents: AgencyAgentRow[];
  agent_count: number;
  player_count: number;
};

export type ColumnDef = {
  name: string;
  uid: keyof AgencyRow | "actions" | "expander";
  sortable?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};
