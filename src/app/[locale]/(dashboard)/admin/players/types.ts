export type PlayerProfileRow = {
  id: string;
  user_id: string;
  slug: string;
  full_name: string;
  nationalities: { code: string | null; name: string }[];
  birth_date: string | null;
  age: number | null;
  current_team_name: string | null;
  current_team_crest_url: string | null;
  current_team_country_code: string | null;
  created_at: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  plan: "free" | "pro" | "pro_plus";
  visibility: "public" | "private";
  market_value_eur: number | null;
  avatar_url: string;
};

export type ColumnDef = {
  name: string;
  uid: keyof PlayerProfileRow | "actions" | "current_team";
  sortable?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};

export type ApplicationRow = {
  id: string;
  applicant: string | null;
  nationalities: { code: string | null; name: string }[];
  birth_date: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  positions: string[];
  links: { url: string }[];
  kyc_docs: { label: string; url: string }[];
  proposed_team_name: string | null;
  proposed_team_country_code: string | null;
};

export type Task = {
  label: string;
  className: string;
};