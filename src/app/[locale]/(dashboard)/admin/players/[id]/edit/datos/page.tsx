import Image from "next/image";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import SectionCard from "@/components/dashboard/client/SectionCard";
import AvatarUploader from "@/components/dashboard/AvatarUploader";
import BasicInformationSection from "@/app/[locale]/(dashboard)/dashboard/edit-profile/personal-data/components/BasicInformationSection";
import ContactInformationSection from "@/app/[locale]/(dashboard)/dashboard/edit-profile/personal-data/components/ContactInformationSection";
import SportProfileSection from "@/app/[locale]/(dashboard)/dashboard/edit-profile/football-data/components/SportProfileSection";
import {
  fetchCountryLookup,
  formatStoredNationalities,
  parseBirthDate,
} from "@/app/[locale]/(dashboard)/dashboard/edit-profile/personal-data/normalize";
import {
  adminUpdateBasicInformation,
  adminUpdateContactInformation,
  adminUpdateSportProfile,
  adminUploadPlayerAsset,
} from "../actions";

export default async function AdminDatosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();

  const [profileRes, personalRes, lookup] = await Promise.all([
    admin
      .from("player_profiles")
      .select(
        "user_id, full_name, birth_date, nationality, nationality_codes, height_cm, weight_kg, bio, foot, contract_status, current_club, positions, avatar_url",
      )
      .eq("id", id)
      .maybeSingle<{
        user_id: string;
        full_name: string | null;
        birth_date: string | null;
        nationality: string[] | null;
        nationality_codes: string[] | null;
        height_cm: number | null;
        weight_kg: number | null;
        bio: string | null;
        foot: string | null;
        contract_status: string | null;
        current_club: string | null;
        positions: string[] | null;
        avatar_url: string | null;
      }>(),
    admin
      .from("player_personal_details")
      .select(
        "residence_city, residence_country, education, phone, languages, document_type, document_number, document_country, whatsapp, show_contact_section",
      )
      .eq("player_id", id)
      .maybeSingle<{
        residence_city: string | null;
        residence_country: string | null;
        education: string | null;
        phone: string | null;
        languages: string[] | null;
        document_type: string | null;
        document_number: string | null;
        document_country: string | null;
        whatsapp: string | null;
        show_contact_section: boolean | null;
      }>(),
    fetchCountryLookup(admin),
  ]);

  const profile = profileRes.data;
  const pd = personalRes.data;

  let email = "";
  if (profile?.user_id) {
    try {
      const { data } = await admin.auth.admin.getUserById(profile.user_id);
      email = data?.user?.email ?? "";
    } catch {
      /* non-fatal */
    }
  }

  const basicInitial = {
    fullName: profile?.full_name ?? "",
    birthDate: parseBirthDate(profile?.birth_date ?? "").display,
    nationalities: formatStoredNationalities(
      profile?.nationality ?? null,
      profile?.nationality_codes ?? null,
      lookup,
    ),
    residence: [pd?.residence_city, pd?.residence_country].filter(Boolean).join(", "),
    heightCm: profile?.height_cm != null ? String(profile.height_cm) : "",
    weightKg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
    bio: profile?.bio ?? "",
    education: pd?.education ?? "",
  };

  const contactInitial = {
    email,
    phone: pd?.phone ?? "",
    languages: (pd?.languages ?? []).join(", "),
    documents: [pd?.document_type, pd?.document_number].filter(Boolean).join(" · "),
    documentCountry: pd?.document_country ?? "",
    whatsapp: pd?.whatsapp ?? "",
    showContactSection: pd?.show_contact_section ?? false,
  };

  const sportInitial = {
    positions: (profile?.positions ?? []).filter(Boolean).join(", "),
    foot: profile?.foot ?? "",
    currentClub: profile?.current_club ?? "",
    contractStatus: profile?.contract_status ?? "",
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Avatar" description="Foto principal del jugador (se sube en su nombre).">
        <div className="flex items-center gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.08] bg-bh-surface-2">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Avatar"
                fill
                sizes="80px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[10px] text-bh-fg-4">—</div>
            )}
          </div>
          <AvatarUploader
            playerId={id}
            currentAvatarUrl={profile?.avatar_url ?? null}
            uploadAction={adminUploadPlayerAsset}
          />
        </div>
      </SectionCard>

      <BasicInformationSection
        playerId={id}
        initialValues={basicInitial}
        action={adminUpdateBasicInformation}
      />

      <SportProfileSection
        playerId={id}
        initialValues={sportInitial}
        action={adminUpdateSportProfile}
      />

      <ContactInformationSection
        playerId={id}
        initialValues={contactInitial}
        action={adminUpdateContactInformation}
      />
    </div>
  );
}
