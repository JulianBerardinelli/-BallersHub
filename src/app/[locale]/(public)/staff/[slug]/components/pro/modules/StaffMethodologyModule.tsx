"use client";

// Módulo Metodología (UNIVERSAL — todos los oficios). NO referencia el fork DT
// (isHeadCoachLayout) a propósito: renderiza siempre que haya rubros approved.
// Free recibe ≤2 rubros sin docs; Pro recibe todos + adjuntos. Ver docs/staff/PLAN.md §5.
import { useTranslations } from "next-intl";
import { Section, Reveal } from "./_shared";
import { methodologyIcon } from "@/lib/staff/methodology-icons";
import type { CoachMethodologyRubroRow, CoachMethodologyDocRow } from "../../CoachPortfolio";

export default function StaffMethodologyModule({
  rubros,
  accent,
}: {
  rubros: CoachMethodologyRubroRow[];
  accent: string;
}) {
  const t = useTranslations("staff");
  if (!rubros.length) return null;
  return (
    <Section id="methodology" title={t("methodology.eyebrow")} accent={accent}>
      <div className="grid gap-10 md:gap-14">
        {rubros.map((r) => {
          const Icon = methodologyIcon(r.icon);
          return (
            <Reveal key={r.id} className="grid gap-3">
              <div className="flex items-center gap-3">
                {Icon && (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-bh-md"
                    style={{ backgroundColor: `${accent}1a`, color: accent }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <h3 className="font-bh-display text-xl font-bold text-white md:text-2xl">{r.title}</h3>
              </div>
              {r.body && (
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/70">{r.body}</p>
              )}
              {r.docs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.docs.map((d) => (
                    <DocChip key={d.id} doc={d} accent={accent} />
                  ))}
                </div>
              )}
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

function DocChip({ doc, accent }: { doc: CoachMethodologyDocRow; accent: string }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 rounded-bh-md border border-white/15 bg-white/[0.05] px-3 py-2 text-[13px] text-white/80 transition-colors hover:border-white/30 hover:text-white"
    >
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ color: accent }}>
        {doc.mime}
      </span>
      <span className="max-w-[220px] truncate">{doc.title || "Documento"}</span>
      <span aria-hidden>↗</span>
    </a>
  );
}
