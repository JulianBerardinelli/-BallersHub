import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { createSupabaseServerRSC } from "@/lib/supabase/server";
import AccountSecurityForm from "./components/AccountSecurityForm";
import NativeLocaleCard from "./components/NativeLocaleCard";

type UserProfileRole = {
  role: string;
  created_at: string;
  preferred_locale: string | null;
};

export default async function AccountSettingsPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createSupabaseServerRSC();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?redirect=/dashboard/settings/account");

  const { data: profileRoleRaw } = await supabase
    .from("user_profiles")
    .select("role, created_at, preferred_locale")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileRole = (profileRoleRaw as UserProfileRole | null) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.accountTitle")}
        description={t("settings.accountDescription")}
      />

      <AccountSecurityForm
        defaultEmail={user.email ?? ""}
        role={profileRole?.role ?? "member"}
        createdAt={profileRole?.created_at ?? ""}
      />

      <NativeLocaleCard current={profileRole?.preferred_locale ?? "es"} />

      <SectionCard
        title={t("settings.securityTitle")}
        description={t("settings.securityDescription")}
      >
        <div className="space-y-3 text-sm text-neutral-300">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <div>
              <p className="font-semibold text-white">{t("settings.twoFactorLabel")}</p>
              <p className="text-xs text-neutral-400">
                {t("settings.twoFactorDescription")}
              </p>
            </div>
            <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">{t("settings.comingSoon")}</span>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <div>
              <p className="font-semibold text-white">{t("settings.federatedLoginLabel")}</p>
              <p className="text-xs text-neutral-400">{t("settings.federatedLoginDescription")}</p>
            </div>
            <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-500">{t("settings.onRoadmap")}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("settings.notificationsTitle")}
        description={t("settings.notificationsDescription")}
      >
        <div className="space-y-3 text-sm text-neutral-300">
          {[
            {
              id: "profile-updates",
              label: t("settings.notifProfileLabel"),
              description: t("settings.notifProfileDescription"),
            },
            {
              id: "applications",
              label: t("settings.notifApplicationsLabel"),
              description: t("settings.notifApplicationsDescription"),
            },
            {
              id: "subscription",
              label: t("settings.notifBillingLabel"),
              description: t("settings.notifBillingDescription"),
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4"
            >
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="text-xs text-neutral-400">{item.description}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="mt-1 h-5 w-5 cursor-not-allowed rounded border-neutral-700 bg-neutral-900 text-primary"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          {t("settings.notificationsFootnote")}
        </p>
      </SectionCard>

      <SectionCard
        title={t("settings.activeSessionsTitle")}
        description={t("settings.activeSessionsDescription")}
      >
        <div className="space-y-3 text-sm text-neutral-300">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
            <p className="font-semibold text-white">{t("settings.currentSessionLabel")}</p>
            <p className="text-xs text-neutral-400">{t("settings.currentSessionDescription")}</p>
          </div>
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-4 text-xs text-neutral-500">
            {t("settings.sessionsIntegrationNote")}
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          {t.rich("settings.suspiciousActivity", {
            link: (chunks) => (
              <Link href="mailto:info@ballershub.co" className="text-primary underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </SectionCard>
    </div>
  );
}
