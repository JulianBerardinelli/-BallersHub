import { redirect } from "next/navigation";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import PageHeader from "@/components/dashboard/client/PageHeader";

import CoachBasicInformationSection from "./components/CoachBasicInformationSection";
import CoachContactInformationSection from "./components/CoachContactInformationSection";

export const dynamic = "force-dynamic";

type CoachPersonalRow = {
  residence_city: string | null;
  residence_country: string | null;
  residence_country_code: string | null;
  languages: string[] | null;
  education: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  document_country: string | null;
  document_country_code: string | null;
  whatsapp: string | null;
  show_contact_section: boolean | null;
};

type CountryRow = { code: string; name_es: string | null; name_en: string | null };

function resolveCountryName(
  countries: Map<string, string>,
  code: string | null | undefined,
  fallback: string | null | undefined,
) {
  if (code && countries.has(code)) return countries.get(code) ?? fallback ?? "";
  return fallback ?? "";
}

export default async function CoachPersonalDataPage() {
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in?redirect=/dashboard/coach/personal-data");

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("id, slug")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; slug: string | null }>();

  if (!coach) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Datos personales"
          description="Residencia, educación, idiomas y contacto."
        />
        <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6 text-sm text-bh-fg-3">
          Tu perfil de entrenador todavía no está activo. Cuando el equipo apruebe tu
          solicitud vas a poder completar tus datos personales desde acá.
        </div>
      </div>
    );
  }

  const [personalRes, countriesRes] = await Promise.all([
    supabase
      .from("coach_personal_details")
      .select(
        "residence_city, residence_country, residence_country_code, languages, education, phone, document_type, document_number, document_country, document_country_code, whatsapp, show_contact_section",
      )
      .eq("coach_id", coach.id)
      .maybeSingle<CoachPersonalRow>(),
    supabase.from("countries").select("code, name_es, name_en"),
  ]);
  const personal = personalRes.data;
  const countriesRaw = (countriesRes.data as CountryRow[] | null) ?? [];
  const countries = new Map<string, string>();
  countriesRaw.forEach((c) => countries.set(c.code, c.name_es ?? c.name_en ?? c.code));

  const residenceCountryName = resolveCountryName(
    countries,
    personal?.residence_country_code,
    personal?.residence_country,
  );
  const residence = [personal?.residence_city ?? "", residenceCountryName]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0)
    .join(", ");

  const languagesValue = personal?.languages?.join(", ") ?? "";
  const documentValue = [personal?.document_type, personal?.document_number]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0)
    .join(" · ");
  const documentCountryName = resolveCountryName(
    countries,
    personal?.document_country_code,
    personal?.document_country,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datos personales"
        description="Residencia, educación e idiomas se publican en tu página pública. Los datos de contacto sólo se ven cuando activás la sección."
      />

      <CoachBasicInformationSection
        coachId={coach.id}
        initialValues={{
          residence,
          education: personal?.education ?? "",
        }}
      />

      <CoachContactInformationSection
        coachId={coach.id}
        initialValues={{
          email: user.email ?? "",
          phone: personal?.phone ?? "",
          languages: languagesValue,
          documents: documentValue,
          documentCountry: documentCountryName,
          whatsapp: personal?.whatsapp ?? "",
          showContactSection: Boolean(personal?.show_contact_section),
        }}
      />
    </div>
  );
}
