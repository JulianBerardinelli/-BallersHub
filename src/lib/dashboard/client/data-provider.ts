import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export type DashboardProfile = {
  id: string;
  status: string;
  slug: string | null;
  visibility: string;
  full_name: string | null;
  birth_date: string | null;
  nationality: string[] | null;
  nationalityCodes: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  bio: string | null;
  avatar_url: string | null;
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  updated_at: string | null;
  plan_public: string | null;
  market_value_eur: string | number | null;
};

export type DashboardPersonalDetails = {
  id: string;
  document_type: string | null;
  document_number: string | null;
  document_country: string | null;
  document_country_code: string | null;
  languages: string[] | null;
  phone: string | null;
  residence_city: string | null;
  residence_country: string | null;
  residence_country_code: string | null;
};

export type DashboardApplication = {
  id: string;
  status: string | null;
  created_at: string | null;
  plan_requested: string | null;
  full_name: string | null;
  nationality: string[] | null;
  positions: string[] | null;
  current_club: string | null;
  notes: string | null;
  transfermarkt_url: string | null;
  external_profile_url: string | null;
};

export type DashboardSubscription = {
  plan: string | null;
  status: string | null;
};

export type DashboardState = {
  userId: string;
  email: string | null;
  profile: DashboardProfile | null;
  personalDetails: DashboardPersonalDetails | null;
  application: DashboardApplication | null;
  subscription: DashboardSubscription | null;
  primaryPhotoUrl: string | null;
};

type DashboardStateRow = {
  user_id: string;
  user_email: string | null;
  profile_id: string | null;
  profile_status: string | null;
  profile_slug: string | null;
  profile_visibility: string | null;
  profile_full_name: string | null;
  profile_birth_date: string | null;
  profile_nationality: string[] | null;
  profile_nationality_codes: string[] | null;
  profile_positions: string[] | null;
  profile_current_club: string | null;
  profile_bio: string | null;
  profile_avatar_url: string | null;
  profile_foot: string | null;
  profile_height_cm: number | null;
  profile_weight_kg: number | null;
  profile_updated_at: string | null;
  profile_plan_public: string | null;
  profile_market_value_eur: string | number | null;
  personal_details_id: string | null;
  personal_document_type: string | null;
  personal_document_number: string | null;
  personal_document_country: string | null;
  personal_document_country_code: string | null;
  personal_languages: string[] | null;
  personal_phone: string | null;
  personal_residence_city: string | null;
  personal_residence_country: string | null;
  personal_residence_country_code: string | null;
  application_id: string | null;
  application_status: string | null;
  application_created_at: string | null;
  application_plan_requested: string | null;
  application_full_name: string | null;
  application_nationality: string[] | null;
  application_positions: string[] | null;
  application_current_club: string | null;
  application_notes: string | null;
  application_transfermarkt_url: string | null;
  application_external_profile_url: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  primary_photo_url: string | null;
};

const DASHBOARD_STATE_COLUMNS = [
  "user_id",
  "user_email",
  "profile_id",
  "profile_status",
  "profile_slug",
  "profile_visibility",
  "profile_full_name",
  "profile_birth_date",
  "profile_nationality",
  "profile_nationality_codes",
  "profile_positions",
  "profile_current_club",
  "profile_bio",
  "profile_avatar_url",
  "profile_foot",
  "profile_height_cm",
  "profile_weight_kg",
  "profile_updated_at",
  "profile_plan_public",
  "profile_market_value_eur",
  "personal_details_id",
  "personal_document_type",
  "personal_document_number",
  "personal_document_country",
  "personal_document_country_code",
  "personal_languages",
  "personal_phone",
  "personal_residence_city",
  "personal_residence_country",
  "personal_residence_country_code",
  "application_id",
  "application_status",
  "application_created_at",
  "application_plan_requested",
  "application_full_name",
  "application_nationality",
  "application_positions",
  "application_current_club",
  "application_notes",
  "application_transfermarkt_url",
  "application_external_profile_url",
  "subscription_plan",
  "subscription_status",
  "primary_photo_url",
] as const;

export async function fetchDashboardState(
  supabase: AnySupabaseClient,
  userId: string,
): Promise<DashboardState> {
  const { data, error } = await supabase
    .from("player_dashboard_state")
    .select(DASHBOARD_STATE_COLUMNS.join(", "))
    .eq("user_id", userId)
    .maybeSingle<DashboardStateRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      userId,
      email: null,
      profile: null,
      personalDetails: null,
      application: null,
      subscription: null,
      primaryPhotoUrl: null,
    };
  }

  const profile: DashboardProfile | null = data.profile_id
    ? {
        id: data.profile_id,
        status: data.profile_status ?? "draft",
        slug: data.profile_slug,
        visibility: data.profile_visibility ?? "private",
        full_name: data.profile_full_name,
        birth_date: data.profile_birth_date,
        nationality: data.profile_nationality,
        nationalityCodes: data.profile_nationality_codes,
        positions: data.profile_positions,
        current_club: data.profile_current_club,
        bio: data.profile_bio,
        avatar_url: data.profile_avatar_url,
        foot: data.profile_foot,
        height_cm: data.profile_height_cm,
        weight_kg: data.profile_weight_kg,
        updated_at: data.profile_updated_at,
        plan_public: data.profile_plan_public,
        market_value_eur: data.profile_market_value_eur,
      }
    : null;

  const personalDetails: DashboardPersonalDetails | null = data.personal_details_id
    ? {
        id: data.personal_details_id,
        document_type: data.personal_document_type,
        document_number: data.personal_document_number,
        document_country: data.personal_document_country,
        document_country_code: data.personal_document_country_code,
        languages: data.personal_languages,
        phone: data.personal_phone,
        residence_city: data.personal_residence_city,
        residence_country: data.personal_residence_country,
        residence_country_code: data.personal_residence_country_code,
      }
    : null;

  const application: DashboardApplication | null = data.application_id
    ? {
        id: data.application_id,
        status: data.application_status,
        created_at: data.application_created_at,
        plan_requested: data.application_plan_requested,
        full_name: data.application_full_name,
        nationality: data.application_nationality,
        positions: data.application_positions,
        current_club: data.application_current_club,
        notes: data.application_notes,
        transfermarkt_url: data.application_transfermarkt_url,
        external_profile_url: data.application_external_profile_url,
      }
    : null;

  const subscription: DashboardSubscription | null =
    data.subscription_plan || data.subscription_status
      ? {
          plan: data.subscription_plan,
          status: data.subscription_status,
        }
      : null;

  return {
    userId: data.user_id,
    email: data.user_email,
    profile,
    personalDetails,
    application,
    subscription,
    primaryPhotoUrl: data.primary_photo_url,
  };
}
