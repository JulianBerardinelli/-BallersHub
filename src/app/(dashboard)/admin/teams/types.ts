// src/app/(dashboard)/admin/teams/types.ts
export type TeamRow = {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  country_code: string | null;
  category: string | null;
  transfermarkt_url: string | null;
  status: "pending" | "approved" | "rejected";
  crest_url: string | null;
  created_at: string;
  updated_at: string | null;
  requested_in_application_id: string | null;
};

export type ColumnDef = {
  name: string;
  uid: keyof TeamRow | "actions" | "id";
  sortable?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
};
