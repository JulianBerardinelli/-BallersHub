import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Mail, Send, Eye, MousePointerClick, AlertOctagon } from "lucide-react";
import { db } from "@/lib/db";
import { marketingCampaigns, marketingSends } from "@/db/schema";
import { TEMPLATE_DESCRIPTORS } from "@/emails";
import StatusChip from "../components/StatusChip";
import CampaignDispatchButton from "./CampaignDispatchButton";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CampaignDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const campaign = await db.query.marketingCampaigns.findFirst({
    where: eq(marketingCampaigns.id, id),
  });
  if (!campaign) notFound();

  const recentSends = await db
    .select()
    .from(marketingSends)
    .where(eq(marketingSends.campaignId, id))
    .orderBy(desc(marketingSends.lastEventAt))
    .limit(50);

  const templateLabel =
    TEMPLATE_DESCRIPTORS.find((t) => t.key === campaign.templateKey)?.label ?? campaign.templateKey;

  const delivered = campaign.totalDelivered;
  const openRate = delivered > 0 ? Math.round((campaign.totalOpened / delivered) * 1000) / 10 : 0;
  const clickRate = delivered > 0 ? Math.round((campaign.totalClicked / delivered) * 1000) / 10 : 0;
  const bounceRate =
    campaign.totalSent > 0 ? Math.round((campaign.totalBounced / campaign.totalSent) * 1000) / 10 : 0;
  const complaintRate =
    delivered > 0 ? Math.round((campaign.totalComplained / delivered) * 10000) / 100 : 0;

  const isFinal = ["sent", "failed"].includes(campaign.status);
  const canDispatch = ["draft", "scheduled", "failed"].includes(campaign.status);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-bh-fg-3 hover:text-bh-lime"
      >
        <ArrowLeft className="size-3" />
        Volver a campañas
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <StatusChip status={campaign.status} />
            <span className="text-[11px] uppercase tracking-[0.08em] text-bh-fg-4">
              Slug: <span className="font-bh-mono text-bh-fg-3">{campaign.slug}</span>
            </span>
          </div>
          <h2 className="font-bh-display text-2xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1">
            {campaign.name}
          </h2>
          <p className="text-sm leading-[1.55] text-bh-fg-3">
            <span className="text-bh-fg-2">Subject:</span> {campaign.subject}
          </p>
          <p className="text-[12px] text-bh-fg-4">
            Template: {templateLabel} · creada{" "}
            {new Date(campaign.createdAt).toLocaleString("es-AR")}
            {campaign.scheduledAt
              ? ` · agendada ${new Date(campaign.scheduledAt).toLocaleString("es-AR")}`
              : ""}
            {campaign.finishedAt
              ? ` · finalizada ${new Date(campaign.finishedAt).toLocaleString("es-AR")}`
              : ""}
          </p>
        </div>

        {canDispatch ? (
          <CampaignDispatchButton
            campaignId={campaign.id}
            currentStatus={campaign.status}
          />
        ) : null}
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<Mail className="size-4" />}
          label="Destinatarios"
          value={campaign.totalRecipients.toLocaleString("es-AR")}
        />
        <Kpi
          icon={<Send className="size-4" />}
          label="Enviados"
          value={campaign.totalSent.toLocaleString("es-AR")}
          subtitle={`${campaign.totalDelivered.toLocaleString("es-AR")} entregados`}
        />
        <Kpi
          icon={<Eye className="size-4" />}
          label="Open rate"
          value={`${openRate}%`}
          subtitle={`${campaign.totalOpened.toLocaleString("es-AR")} aperturas`}
          tone="lime"
        />
        <Kpi
          icon={<MousePointerClick className="size-4" />}
          label="Click rate"
          value={`${clickRate}%`}
          subtitle={`${campaign.totalClicked.toLocaleString("es-AR")} clicks`}
          tone="lime"
        />
      </div>

      {/* Issue stats */}
      {(campaign.totalBounced > 0 || campaign.totalComplained > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Kpi
            icon={<AlertOctagon className="size-4" />}
            label="Bounce rate"
            value={`${bounceRate}%`}
            subtitle={`${campaign.totalBounced.toLocaleString("es-AR")} bounces`}
            tone={bounceRate > 5 ? "danger" : "muted"}
          />
          <Kpi
            icon={<AlertOctagon className="size-4" />}
            label="Complaint rate"
            value={`${complaintRate}%`}
            subtitle={`${campaign.totalComplained.toLocaleString("es-AR")} complaints`}
            tone={complaintRate > 0.1 ? "danger" : "muted"}
          />
        </div>
      )}

      {/* Audience snapshot */}
      <Section title="Audiencia (snapshot al crear la campaña)">
        <pre className="overflow-x-auto rounded-bh-md border border-white/[0.06] bg-bh-bg p-3 font-bh-mono text-[11px] leading-[1.6] text-bh-fg-2">
          {JSON.stringify(campaign.audienceFilter, null, 2)}
        </pre>
      </Section>

      {/* Sends drill-down */}
      <Section
        title="Últimos envíos"
        subtitle={
          recentSends.length > 0
            ? `Mostrando los ${recentSends.length} más recientes (orden por última actividad)`
            : isFinal
              ? "No se registraron envíos."
              : "Aún no se enviaron emails. Hacé click en 'Enviar ahora' para disparar."
        }
      >
        {recentSends.length > 0 ? (
          <div className="overflow-x-auto rounded-bh-md border border-white/[0.06]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-bh-bg/40">
                  <Th>Email</Th>
                  <Th>Estado</Th>
                  <Th>Enviado</Th>
                  <Th>Última actividad</Th>
                  <Th>Error</Th>
                </tr>
              </thead>
              <tbody>
                {recentSends.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015]"
                  >
                    <Td>
                      <span className="font-bh-mono text-[12px] text-bh-fg-2">{s.email}</span>
                    </Td>
                    <Td>
                      <SendStatusChip status={s.status} />
                    </Td>
                    <Td>
                      <span className="text-[11px] text-bh-fg-3">
                        {s.sentAt ? new Date(s.sentAt).toLocaleString("es-AR") : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[11px] text-bh-fg-3">
                        {s.lastEventAt ? new Date(s.lastEventAt).toLocaleString("es-AR") : "—"}
                      </span>
                    </Td>
                    <Td>
                      {s.error ? (
                        <span className="text-[11px] text-bh-danger">{s.error}</span>
                      ) : (
                        <span className="text-bh-fg-4">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Local subcomponents
// ----------------------------------------------------------------------------

function Kpi({
  icon,
  label,
  value,
  subtitle,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: React.ReactNode;
  tone?: "default" | "lime" | "muted" | "danger";
}) {
  const accent =
    tone === "lime"
      ? "text-bh-lime"
      : tone === "muted"
        ? "text-bh-fg-3"
        : tone === "danger"
          ? "text-bh-danger"
          : "text-bh-fg-1";
  return (
    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4">
        <span className="text-bh-fg-3">{icon}</span>
        {label}
      </div>
      <div className={`font-bh-display text-2xl font-bold leading-none ${accent}`}>{value}</div>
      {subtitle ? <div className="mt-1.5 text-[11px] text-bh-fg-4">{subtitle}</div> : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <div className="space-y-0.5">
        <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
          {title}
        </h3>
        {subtitle ? <p className="text-[12px] text-bh-fg-3">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function SendStatusChip({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    queued: { color: "text-bh-fg-3 border-white/[0.12] bg-white/[0.04]", label: "En cola" },
    sent: { color: "text-bh-fg-2 border-white/[0.18] bg-white/[0.06]", label: "Enviado" },
    delivered: { color: "text-bh-success border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.10)]", label: "Entregado" },
    opened: { color: "text-bh-lime border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.08)]", label: "Abierto" },
    clicked: { color: "text-bh-lime border-[rgba(204,255,0,0.35)] bg-[rgba(204,255,0,0.12)]", label: "Click" },
    bounced: { color: "text-bh-danger border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]", label: "Bounce" },
    complained: { color: "text-bh-danger border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)]", label: "Complaint" },
    failed: { color: "text-bh-danger border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]", label: "Fallido" },
  };
  const cfg = map[status] ?? map.queued;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}
