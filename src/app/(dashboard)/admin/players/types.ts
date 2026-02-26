export type Task = {
  label: string;
  className: string; // Tailwind classes for faded chip colors
};

export type LinkInfo = { label: string; url: string };
export type KycDoc = { label: string; url: string };

export type ApplicationRow = {
  id: string;
  applicant: string | null;
  nationalities: { code: string | null; name: string }[];
  positions: string[];
  birth_date: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  plan: "free" | "pro" | "pro_plus";
  current_team_name: string | null;
  current_team_crest_url: string | null;
  current_team_country_code: string | null;
  proposed_team_name: string | null;
  proposed_team_country_code: string | null;
  free_agent: boolean;
  tasks: Task[];
  personal_info_approved: boolean;
  links: LinkInfo[];
  kyc_docs: KycDoc[];
};

export type ColumnDef = {
  name: string;
  uid: keyof ApplicationRow | "actions" | "current_team" | "id";
  sortable?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};