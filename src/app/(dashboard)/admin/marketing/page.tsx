import Link from "next/link";
import { desc } from "drizzle-orm";
import { Mail, MailMinus, Send, Eye, MousePointerClick, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { marketingCampaigns } from "@/db/schema";
import { fetchGlobalStats } from "./actions";
import { TEMPLATE_DESCRIPTORS } from "@/emails";
import CampaignDeleteButton from "./components/CampaignDeleteButton";
import StatusChip from "./components/StatusChip";

export const dynamic = "force-dynamic";

export default async function MarketingAdminPage() {
  const [stats, campaigns] = await Promise.all([
    fetchGlobalStats(),
    db
      .select()
      .from(marketingCampaigns)
      .orderBy(desc(marketingCampaigns.createdAt))
      .limit(50),
  ]);

  const templateLabelByKey = new Map<string, string>(
    TEMPLATE_DESCRIPTORS.map((t) => [t.key, t.label]),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-bh-display text-2xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1">
            Campañas de marketing
          </h2>
          <p className="text-sm leading-[1.55] text-bh-fg-3">
            Creá broadcasts y drips para tus suscriptores. Toda campaña pasa por la
            suppression list y el cap de frecuencia automáticamente.
          </p>
        </div>
        <Link
          href="/admin/marketing/new"
          className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-4 py-2 text-[13px] font-semibold text-bh-black transition-all hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          <Plus className="size-4" />
          Nueva campaña
        </Link>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Mail className="size-4" />}
          label="Suscriptores"
          value={stats.subscribers.toLocaleString("es-AR")}
          tone="lime"
        />
        <KpiCard
          icon={<MailMinus className="size-4" />}
          label="Desuscriptos"
          value={stats.unsubscribes.toLocaleString("es-AR")}
          tone="muted"
        />
        <KpiCard
          icon={<Send className="size-4" />}
          label="Enviados (30d)"
          value={stats.sent30d.toLocaleString("es-AR")}
          subtitle={`${stats.delivered30d.toLocaleString("es-AR")} entregados`}
        />
        <KpiCard
          icon={<Eye className="size-4" />}
          label="Open rate (30d)"
          value={`${stats.openRate30d}%`}
          subtitle={
            stats.clickRate30d > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MousePointerClick className="size-3" />
                {stats.clickRate30d}% click rate
              </span>
            ) : null
          }
        />
      </div>

      {/* Campaigns table */}
      <section className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
            Últimas campañas
          </h3>
          <span className="text-[11px] uppercase tracking-[0.08em] text-bh-fg-4">
            {campaigns.length} {campaigns.length === 1 ? "campaña" : "campañas"}
          </span>
        </header>

        {campaigns.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-bh-fg-3">Todavía no creaste ninguna campaña.</p>
            <Link
              href="/admin/marketing/new"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-4 py-2 text-[13px] font-medium text-bh-fg-2 hover:border-white/[0.22] hover:bg-white/[0.04] hover:text-bh-fg-1"
            >
              <Plus className="size-4" />
              Crear la primera
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <Th>Nombre</Th>
                <Th>Template</Th>
                <Th>Estado</Th>
                <Th align="right">Destinatarios</Th>
                <Th align="right">Open</Th>
                <Th align="right">Click</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const openRate =
                  c.totalDelivered > 0
                    ? Math.round((c.totalOpened / c.totalDelivered) * 1000) / 10
                    : 0;
                const clickRate =
                  c.totalDelivered > 0
                    ? Math.round((c.totalClicked / c.totalDelivered) * 1000) / 10
                    : 0;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015]"
                  >
                    <Td>
                      <Link
                        href={`/admin/marketing/${c.id}`}
                        className="block font-medium text-bh-fg-1 hover:text-bh-lime"
                      >
                        {c.name}
                      </Link>
                      <span className="text-[11px] text-bh-fg-4 font-bh-mono">{c.slug}</span>
                    </Td>
                    <Td>
                      <span className="text-[12px] text-bh-fg-2">
                        {templateLabelByKey.get(c.templateKey) ?? c.templateKey}
                      </span>
                    </Td>
                    <Td>
                      <StatusChip status={c.status} />
                    </Td>
                    <Td align="right">
                      <span className="font-bh-mono text-[12px] text-bh-fg-1">
                        {c.totalRecipients.toLocaleString("es-AR")}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-bh-mono text-[12px] text-bh-fg-2">{openRate}%</span>
                    </Td>
                    <Td align="right">
                      <span className="font-bh-mono text-[12px] text-bh-fg-2">{clickRate}%</span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/marketing/${c.id}`}
                          className="text-[12px] text-bh-fg-3 hover:text-bh-lime"
                        >
                          Ver
                        </Link>
                        {["draft", "scheduled", "failed"].includes(c.status) ? (
                          <CampaignDeleteButton campaignId={c.id} campaignName={c.name} />
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Local subcomponents (kept here to avoid one-shot files)
// ----------------------------------------------------------------------------

function KpiCard({
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
  tone?: "default" | "lime" | "muted";
}) {
  const accent =
    tone === "lime"
      ? "text-bh-lime"
      : tone === "muted"
        ? "text-bh-fg-3"
        : "text-bh-fg-1";
  return (
    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-4">
        <span className="text-bh-fg-3">{icon}</span>
        {label}
      </div>
      <div className={`font-bh-display text-2xl font-bold leading-none ${accent}`}>{value}</div>
      {subtitle ? (
        <div className="mt-1.5 text-[11px] text-bh-fg-4">{subtitle}</div>
      ) : null}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-3 font-bh-display text-[10px] font-bold uppercase tracking-[0.1em] text-bh-fg-4 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <td className={`px-4 py-3 align-middle ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  );
}
