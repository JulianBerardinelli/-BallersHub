import { redirect, notFound } from "next/navigation";

import { createSupabaseServerRSC } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import CoachBasicInformationSection from "@/app/[locale]/(dashboard)/dashboard/coach/personal-data/components/CoachBasicInformationSection";
import CoachContactInformationSection from "@/app/[locale]/(dashboard)/dashboard/coach/personal-data/components/CoachContactInformationSection";
import {
  adminUpdateCoachBasicInformation,
  adminUpdateCoachContactInformation,
} from "@/app/actions/coach-personal-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar datos personales - Ballers Hub" };

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

export default async function AdminCoachPersonalDataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?redirect=/admin/coaches/${id}/edit/datos-personales`);
  const { data: up } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (up?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdmin();
  const { data: coach } = await admin
    .from("coach_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle<{ id: string }>();
  if (!coach) notFound();

  const [personalRes, countriesRes] = await Promise.all([
    admin
      .from("coach_personal_details")
      .select(
        "residence_city, residence_country, residence_country_code, languages, education, phone, document_type, document_number, document_country, document_country_code, whatsapp, show_contact_section",
      )
      .eq("coach_id", id)
      .maybeSingle<CoachPersonalRow>(),
    admin.from("countries").select("code, name_es, name_en"),
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
      <CoachBasicInformationSection
        coachId={id}
        initialValues={{
          residence,
          education: personal?.education ?? "",
        }}
        action={(input) =>
          adminUpdateCoachBasicInformation(id, {
            residence: input.residence,
            education: input.education,
          })
        }
      />

      <CoachContactInformationSection
        coachId={id}
        initialValues={{
          email: "",
          phone: personal?.phone ?? "",
          languages: languagesValue,
          documents: documentValue,
          documentCountry: documentCountryName,
          whatsapp: personal?.whatsapp ?? "",
          showContactSection: Boolean(personal?.show_contact_section),
        }}
        hideEmail
        action={(input) =>
          adminUpdateCoachContactInformation(id, {
            phone: input.phone,
            languages: input.languages,
            documents: input.documents,
            documentCountry: input.documentCountry,
            whatsapp: input.whatsapp,
            showContactSection: input.showContactSection,
          })
        }
      />
    </div>
  );
}
