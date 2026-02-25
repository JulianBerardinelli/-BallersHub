import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

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
  contract_status: string | null;
  bio: string | null;
  avatar_url: string | null;
  foot: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  updated_at: string | null;
  plan_public: string | null;
  market_value_eur: string | number | null;
  career_objectives: string | null;
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
  profile_contract_status: string | null;
  profile_bio: string | null;
  profile_avatar_url: string | null;
  profile_foot: string | null;
  profile_height_cm: number | null;
  profile_weight_kg: number | null;
  profile_updated_at: string | null;
  profile_plan_public: string | null;
  profile_market_value_eur: string | number | null;
  profile_career_objectives: string | null;
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
  "profile_contract_status",
  "profile_bio",
  "profile_avatar_url",
  "profile_foot",
  "profile_height_cm",
  "profile_weight_kg",
  "profile_updated_at",
  "profile_plan_public",
  "profile_market_value_eur",
  "profile_career_objectives",
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
    if (isMissingSchemaEntity(error)) {
      return fetchDashboardStateFromBaseTables(supabase, userId);
    }

    throw error;
  }

  return mapDashboardStateRow(userId, data ?? null);
}

function isMissingSchemaEntity(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === "PGRST205";
}

async function fetchDashboardStateFromBaseTables(
  supabase: AnySupabaseClient,
  userId: string,
): Promise<DashboardState> {
  type ProfileRow = {
    id: string;
    status: string | null;
    slug: string | null;
    visibility: string | null;
    full_name: string | null;
    birth_date: string | null;
    nationality: string[] | null;
    nationality_codes: string[] | null;
    positions: string[] | null;
    current_club: string | null;
    contract_status: string | null;
    bio: string | null;
    avatar_url: string | null;
    foot: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    updated_at: string | null;
    plan_public: string | null;
    market_value_eur: string | number | null;
    career_objectives: string | null;
  };

  type PersonalDetailsRow = {
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

  type ApplicationRow = {
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

  type SubscriptionRow = {
    plan: string | null;
    status: string | null;
  };

  type MediaRow = {
    url: string | null;
  };

  const profileResult = await supabase
    .from("player_profiles")
    .select(
      [
        "id",
        "status",
        "slug",
        "visibility",
        "full_name",
        "birth_date",
        "nationality",
        "nationality_codes",
        "positions",
        "current_club",
        "contract_status",
        "bio",
        "avatar_url",
        "foot",
        "height_cm",
        "weight_kg",
        "updated_at",
        "plan_public",
        "market_value_eur",
        "career_objectives",
      ].join(", "),
    )
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profileRow = profileResult.data ?? null;

  const [personalDetailsResult, primaryPhotoResult] = profileRow
    ? await Promise.all([
        supabase
          .from("player_personal_details")
          .select(
            [
              "id",
              "document_type",
              "document_number",
              "document_country",
              "document_country_code",
              "languages",
              "phone",
              "residence_city",
              "residence_country",
              "residence_country_code",
            ].join(", "),
          )
          .eq("player_id", profileRow.id)
          .maybeSingle<PersonalDetailsRow>(),
        supabase
          .from("player_media")
          .select("url")
          .eq("player_id", profileRow.id)
          .eq("type", "photo")
          .eq("is_primary", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<MediaRow>(),
      ])
    : [
        { data: null, error: null } as { data: PersonalDetailsRow | null; error: PostgrestError | null },
        { data: null, error: null } as { data: MediaRow | null; error: PostgrestError | null },
      ];

  if (personalDetailsResult.error) {
    throw personalDetailsResult.error;
  }

  if (primaryPhotoResult.error) {
    throw primaryPhotoResult.error;
  }

  const applicationResult = await supabase
    .from("player_applications")
    .select(
      [
        "id",
        "status",
        "created_at",
        "plan_requested",
        "full_name",
        "nationality",
        "positions",
        "current_club",
        "notes",
        "transfermarkt_url",
        "external_profile_url",
      ].join(", "),
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ApplicationRow>();

  if (applicationResult.error) {
    throw applicationResult.error;
  }

  const subscriptionResult = await supabase
    .from("subscriptions")
    .select(["plan", "status"].join(", "))
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (subscriptionResult.error) {
    throw subscriptionResult.error;
  }

  const row: DashboardStateRow | null =
    profileRow ||
    personalDetailsResult.data ||
    applicationResult.data ||
    subscriptionResult.data ||
    primaryPhotoResult.data
      ? {
          user_id: userId,
          user_email: null,
          profile_id: profileRow?.id ?? null,
          profile_status: profileRow?.status ?? null,
          profile_slug: profileRow?.slug ?? null,
          profile_visibility: profileRow?.visibility ?? null,
          profile_full_name: profileRow?.full_name ?? null,
          profile_birth_date: profileRow?.birth_date ?? null,
          profile_nationality: profileRow?.nationality ?? null,
          profile_nationality_codes: profileRow?.nationality_codes ?? null,
          profile_positions: profileRow?.positions ?? null,
          profile_current_club: profileRow?.current_club ?? null,
          profile_contract_status: profileRow?.contract_status ?? null,
          profile_bio: profileRow?.bio ?? null,
          profile_avatar_url: profileRow?.avatar_url ?? null,
          profile_foot: profileRow?.foot ?? null,
          profile_height_cm: profileRow?.height_cm ?? null,
          profile_weight_kg: profileRow?.weight_kg ?? null,
          profile_updated_at: profileRow?.updated_at ?? null,
          profile_plan_public: profileRow?.plan_public ?? null,
          profile_market_value_eur: profileRow?.market_value_eur ?? null,
          profile_career_objectives: profileRow?.career_objectives ?? null,
          personal_details_id: personalDetailsResult.data?.id ?? null,
          personal_document_type: personalDetailsResult.data?.document_type ?? null,
          personal_document_number: personalDetailsResult.data?.document_number ?? null,
          personal_document_country: personalDetailsResult.data?.document_country ?? null,
          personal_document_country_code: personalDetailsResult.data?.document_country_code ?? null,
          personal_languages: personalDetailsResult.data?.languages ?? null,
          personal_phone: personalDetailsResult.data?.phone ?? null,
          personal_residence_city: personalDetailsResult.data?.residence_city ?? null,
          personal_residence_country: personalDetailsResult.data?.residence_country ?? null,
          personal_residence_country_code: personalDetailsResult.data?.residence_country_code ?? null,
          application_id: applicationResult.data?.id ?? null,
          application_status: applicationResult.data?.status ?? null,
          application_created_at: applicationResult.data?.created_at ?? null,
          application_plan_requested: applicationResult.data?.plan_requested ?? null,
          application_full_name: applicationResult.data?.full_name ?? null,
          application_nationality: applicationResult.data?.nationality ?? null,
          application_positions: applicationResult.data?.positions ?? null,
          application_current_club: applicationResult.data?.current_club ?? null,
          application_notes: applicationResult.data?.notes ?? null,
          application_transfermarkt_url: applicationResult.data?.transfermarkt_url ?? null,
          application_external_profile_url: applicationResult.data?.external_profile_url ?? null,
          subscription_plan: subscriptionResult.data?.plan ?? null,
          subscription_status: subscriptionResult.data?.status ?? null,
          primary_photo_url: primaryPhotoResult.data?.url ?? null,
        }
      : null;

  return mapDashboardStateRow(userId, row);
}

function mapDashboardStateRow(userId: string, row: DashboardStateRow | null): DashboardState {
  if (!row) {
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

  const profile: DashboardProfile | null = row.profile_id
    ? {
        id: row.profile_id,
        status: row.profile_status ?? "draft",
        slug: row.profile_slug,
        visibility: row.profile_visibility ?? "private",
        full_name: row.profile_full_name,
        birth_date: row.profile_birth_date,
        nationality: row.profile_nationality,
        nationalityCodes: row.profile_nationality_codes,
        positions: row.profile_positions,
        current_club: row.profile_current_club,
        contract_status: row.profile_contract_status,
        bio: row.profile_bio,
        avatar_url: row.profile_avatar_url,
        foot: row.profile_foot,
        height_cm: row.profile_height_cm,
        weight_kg: row.profile_weight_kg,
        updated_at: row.profile_updated_at,
        plan_public: row.profile_plan_public,
        market_value_eur: row.profile_market_value_eur,
        career_objectives: row.profile_career_objectives,
      }
    : null;

  const personalDetails: DashboardPersonalDetails | null = row.personal_details_id
    ? {
        id: row.personal_details_id,
        document_type: row.personal_document_type,
        document_number: row.personal_document_number,
        document_country: row.personal_document_country,
        document_country_code: row.personal_document_country_code,
        languages: row.personal_languages,
        phone: row.personal_phone,
        residence_city: row.personal_residence_city,
        residence_country: row.personal_residence_country,
        residence_country_code: row.personal_residence_country_code,
      }
    : null;

  const application: DashboardApplication | null = row.application_id
    ? {
        id: row.application_id,
        status: row.application_status,
        created_at: row.application_created_at,
        plan_requested: row.application_plan_requested,
        full_name: row.application_full_name,
        nationality: row.application_nationality,
        positions: row.application_positions,
        current_club: row.application_current_club,
        notes: row.application_notes,
        transfermarkt_url: row.application_transfermarkt_url,
        external_profile_url: row.application_external_profile_url,
      }
    : null;

  const subscription: DashboardSubscription | null = row.subscription_plan || row.subscription_status
    ? {
        plan: row.subscription_plan,
        status: row.subscription_status,
      }
    : null;

  return {
    userId: row.user_id ?? userId,
    email: row.user_email,
    profile,
    personalDetails,
    application,
    subscription,
    primaryPhotoUrl: row.primary_photo_url,
  };
}
