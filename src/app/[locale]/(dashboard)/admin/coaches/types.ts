export type CoachAdminStatus = "draft" | "pending_review" | "approved" | "rejected";
export type CoachAdminPlan = "free" | "pro";

export type CoachAdminRow = {
  id: string;
  user_id: string;
  slug: string;
  full_name: string;
  role_title: string | null;
  nationality: string[];
  current_club: string | null;
  status: CoachAdminStatus;
  visibility: "public" | "private";
  avatar_url: string;
  created_at: string;
  plan: CoachAdminPlan;
};
