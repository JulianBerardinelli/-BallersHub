import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { ArrowLeft, Snowflake, ThermometerSnowflake } from "lucide-react";
import { db } from "@/lib/db";
import { marketingSubscriptions } from "@/db/schema";
import { fetchEngagementBreakdown } from "@/lib/marketing";
import EngagementBreakdownBar from "../components/EngagementBreakdownBar";
import EngagementTierChip from "./components/EngagementTierChip";

export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const [breakdown, atRisk] = await Promise.all([
    fetchEngagementBreakdown(),
    // Top-100 most disengaged subscribers — sorted by skipped count desc.
    db
      .select({
        email: marketingSubscriptions.email,
        userId: marketingSubscriptions.userId,
        tier: marketingSubscriptions.engagementTier,
        skipped: marketingSubscriptions.consecutiveSkippedSends,
        totalSends: marketingSubscriptions.totalSends,
        totalOpens: marketingSubscriptions.totalOpens,
        totalClicks: marketingSubscriptions.totalClicks,
        lastSentAt: marketingSubscriptions.lastSentAt,
        lastEngagedAt: marketingSubscriptions.lastEngagedAt,
        source: marketingSubscriptions.source,
      })
      .from(marketingSubscriptions)
      .where(sql`engagement_tier in ('cold', 'dormant')`)
      .orderBy(desc(marketingSubscriptions.consecutiveSkippedSends), desc(marketingSubscriptions.lastSentAt))
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-bh-fg-3 hover:text-bh-lime"
      >
        <ArrowLeft className="size-3" />
        Volver a marketing
      </Link>

      <header className="space-y-1">
        <h2 className="font-bh-display text-2xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1">
          Engagement
        </h2>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Distribución de tu lista por nivel de actividad. Los suscriptores en estado{" "}
          <span className="text-bh-warning">cold</span> son candidatos para una campaña de
          reactivación; los en estado <span className="text-bh-danger">dormant</span> los
          mueve la cron diaria a la suppression list automáticamente.
        </p>
      </header>

      <EngagementBreakdownBar breakdown={breakdown} />

      {/* Thresholds reference */}
      <section className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        <h3 className="mb-3 font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
          Reglas de tier
        </h3>
        <ul className="grid gap-2 text-[13px] leading-[1.5] text-bh-fg-2 md:grid-cols-2">
          <li>
            <strong className="text-bh-lime">Active</strong> · 0 sends sin abrir (o lista nueva)
          </li>
          <li>
            <strong className="text-bh-blue">Warm</strong> · 1-2 sends sin abrir
          </li>
          <li>
            <strong className="text-bh-warning">Cold</strong> · 3-5 sends sin abrir · audiencia opt-out posible
          </li>
          <li>
            <strong className="text-bh-danger">Dormant</strong> · 6+ sends sin abrir · auto-suppress diario
          </li>
        </ul>
      </section>

      {/* At-risk drill-down */}
      <section className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-2">
            <ThermometerSnowflake className="size-4 text-bh-warning" />
            <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
              At risk · cold + dormant
            </h3>
          </div>
          <span className="text-[11px] uppercase tracking-[0.08em] text-bh-fg-4">
            Top {atRisk.length} más disengagés
          </span>
        </header>

        {atRisk.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-bh-fg-3">
              Nadie en cold o dormant. Tu lista está saludable. <Snowflake className="inline size-4 text-bh-blue" />
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <Th>Email</Th>
                  <Th>Tier</Th>
                  <Th align="right">Sends</Th>
                  <Th align="right">Skipped</Th>
                  <Th align="right">Opens</Th>
                  <Th align="right">Clicks</Th>
                  <Th>Última act.</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((s) => (
                  <tr key={s.email} className="border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.015]">
                    <Td>
                      <span className="font-bh-mono text-[12px] text-bh-fg-2">{s.email}</span>
                    </Td>
                    <Td>
                      <EngagementTierChip tier={s.tier as "cold" | "dormant"} />
                    </Td>
                    <Td align="right">
                      <span className="font-bh-mono text-[12px] text-bh-fg-1">{s.totalSends}</span>
                    </Td>
                    <Td align="right">
                      <span className={`font-bh-mono text-[12px] font-semibold ${s.skipped >= 6 ? "text-bh-danger" : "text-bh-warning"}`}>
                        {s.skipped}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-bh-mono text-[12px] text-bh-fg-2">{s.totalOpens}</span>
                    </Td>
                    <Td align="right">
                      <span className="font-bh-mono text-[12px] text-bh-fg-2">{s.totalClicks}</span>
                    </Td>
                    <Td>
                      <span className="text-[11px] text-bh-fg-3">
                        {s.lastEngagedAt
                          ? new Date(s.lastEngagedAt).toLocaleDateString("es-AR")
                          : s.lastSentAt
                            ? `${new Date(s.lastSentAt).toLocaleDateString("es-AR")} (sin engagement)`
                            : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[11px] text-bh-fg-4">{s.source}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
