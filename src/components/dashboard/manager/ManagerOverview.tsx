import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/client/PageHeader";
import SectionCard from "@/components/dashboard/client/SectionCard";
import DashboardStatusSummary, {
  type DashboardStatusSummaryProps,
} from "@/components/dashboard/client/overview/DashboardStatusSummary";
import type { ApplicationReviewDetails } from "@/components/dashboard/client/overview/ApplicationReviewModal";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

type ManagerApp = {
  id?: string | null;
  status: string;
  agency_name: string | null;
  created_at: string;
  updated_at?: string | null;
  full_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  agency_website_url?: string | null;
  notes?: string | null;
} | null;

type AgencyData = {
  slug: string;
  playersCount: number;
  staffCount: number;
} | null;

function buildQuickActions(t: Translator) {
  return [
    {
      id: "agency",
      title: t("managerOverview.quickActions.agency.title"),
      description: t("managerOverview.quickActions.agency.description"),
      href: "/dashboard/agency",
    },
    {
      id: "template-styles",
      title: t("managerOverview.quickActions.templateStyles.title"),
      description: t("managerOverview.quickActions.templateStyles.description"),
      href: "/dashboard/agency/edit-template/styles",
    },
    {
      id: "players",
      title: t("managerOverview.quickActions.players.title"),
      description: t("managerOverview.quickActions.players.description"),
      href: "/dashboard/players",
    },
    {
      id: "staff",
      title: t("managerOverview.quickActions.staff.title"),
      description: t("managerOverview.quickActions.staff.description"),
      href: "/dashboard/agency/staff",
    },
  ];
}

function buildManagerReviewDetails(
  t: Translator,
  app: NonNullable<ManagerApp>,
): ApplicationReviewDetails | null {
  if (!app.id) return null;
  const isPending = app.status === "pending";
  return {
    id: app.id,
    type: "manager",
    status: app.status,
    statusLabel: isPending
      ? t("home.applicationStatus.pending.label")
      : app.status === "approved"
        ? t("home.applicationStatus.approved.label")
        : app.status === "rejected"
          ? t("home.applicationStatus.rejected.label")
          : app.status,
    statusColor: isPending
      ? "warning"
      : app.status === "approved"
        ? "success"
        : app.status === "rejected"
          ? "danger"
          : "default",
    createdAt: app.created_at,
    updatedAt: app.updated_at ?? null,
    fullName: app.full_name ?? null,
    agencyName: app.agency_name,
    agencyWebsite: app.agency_website_url ?? null,
    contactEmail: app.contact_email ?? null,
    contactPhone: app.contact_phone ?? null,
    notes: app.notes ?? null,
  };
}

export default async function ManagerOverview({ managerApp, role, agencyData }: { managerApp: ManagerApp, role: string, agencyData: AgencyData }) {
  const t = await getTranslations("dashboard");
  const isPending = managerApp?.status === "pending";
  const isApproved = managerApp?.status === "approved" || role === "manager";

  const getStatusProps = (): DashboardStatusSummaryProps => {
    if (isPending && managerApp) {
      const details = buildManagerReviewDetails(t, managerApp);
      return {
        profileStatus: {
          code: "pending",
          label: t("managerOverview.status.pendingLabel"),
          message: t("managerOverview.status.pendingMessage"),
          color: "warning" as const
        },
        visibility: null,
        publicUrl: null,
        updatedAt: null,
        applicationStatus: null,
        cta: details
          ? {
              kind: "review-application",
              label: t("managerOverview.cta.viewApplication"),
              variant: "bordered" as const,
              color: "warning" as const,
              details,
            }
          : undefined,
      };
    }

    if (isApproved) {
      const cta = agencyData?.slug ? {
        label: t("managerOverview.cta.viewPublicAgency"),
        href: `/agency/${agencyData.slug}`,
        variant: "solid" as const,
        color: "primary" as const,
      } : {
        label: t("managerOverview.cta.configurePublicUrl"),
        href: "/dashboard/agency",
        variant: "solid" as const,
        color: "warning" as const,
      };

      return {
        profileStatus: {
          code: "approved",
          label: t("managerOverview.status.approvedLabel"),
          message: t("managerOverview.status.approvedMessage", {
            agencyName: managerApp?.agency_name ?? t("managerOverview.status.agencyFallback"),
          }),
          color: "success" as const
        },
        visibility: "public",
        publicUrl: agencyData?.slug ? `/agency/${agencyData.slug}` : null,
        updatedAt: null,
        applicationStatus: null,
        cta
      };
    }

    return {
      profileStatus: {
        code: "rejected",
        label: t("managerOverview.status.rejectedLabel"),
        message: t("managerOverview.status.rejectedMessage"),
        color: "danger" as const
      },
      visibility: null,
      publicUrl: null,
      updatedAt: null,
      applicationStatus: null,
    };
  };

  const quickActions = buildQuickActions(t);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("managerOverview.header.title")}
        description={t("managerOverview.header.description")}
      />

      <SectionCard
        title={t("managerOverview.operationalStatus.title")}
        description={t("managerOverview.operationalStatus.description")}
      >
        <DashboardStatusSummary {...getStatusProps()} />
      </SectionCard>

      {isApproved && (
         <div className="grid gap-6 md:grid-cols-2">
            <SectionCard
              title={t("managerOverview.directory.playersTitle")}
              description={t("managerOverview.directory.playersDescription")}
            >
               <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-2 border border-dashed border-neutral-800 rounded-lg bg-neutral-950/40">
                  <span className="text-4xl font-bold text-white shadow-xl">
                    {agencyData?.playersCount || 0}
                  </span>
                  <span className="text-sm font-medium">{t("managerOverview.directory.playersBadge")}</span>
                  <Link href="/dashboard/players" className="mt-2 text-primary text-sm font-semibold hover:underline">
                    {t("managerOverview.directory.playersCta")}
                  </Link>
               </div>
            </SectionCard>

            <SectionCard
              title={t("managerOverview.directory.staffTitle")}
              description={t("managerOverview.directory.staffDescription")}
            >
               <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 gap-2 border border-dashed border-neutral-800 rounded-lg bg-neutral-950/40">
                 <span className="text-4xl font-bold text-white shadow-xl">
                    {agencyData?.staffCount || 1}
                  </span>
                  <span className="text-sm font-medium">{t("managerOverview.directory.staffBadge")}</span>
                  <Link href="/dashboard/agency/staff" className="mt-2 text-primary text-sm font-semibold hover:underline">
                    {t("managerOverview.directory.staffCta")}
                  </Link>
               </div>
            </SectionCard>
         </div>
      )}

      {isApproved && (
        <SectionCard
          title={t("managerOverview.quickActions.title")}
          description={t("managerOverview.quickActions.description")}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="flex h-full flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900/50"
              >
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">{action.title}</p>
                  <p className="text-xs text-neutral-400">{action.description}</p>
                </div>
                <span className="mt-4 text-xs font-medium text-primary">{t("managerOverview.quickActions.goToSection")}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
