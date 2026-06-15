import { getTranslations } from "next-intl/server";
import { CalendarCheck, Sparkles, Trophy } from "lucide-react";

type FeatureKey = "verification" | "schedule" | "presentations";

const FEATURE_DEFS: ReadonlyArray<{
  key: FeatureKey;
  icon: React.ComponentType<{ className?: string }>;
  accent: "lime" | "blue";
}> = [
  { key: "verification", icon: Trophy, accent: "lime" },
  { key: "schedule", icon: CalendarCheck, accent: "blue" },
  { key: "presentations", icon: Sparkles, accent: "lime" },
];

export default async function FeatureHighlights() {
  const t = await getTranslations("home.features");
  return (
    <section className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          {t("eyebrow")}
        </span>
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          {t("title")}
        </h2>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {FEATURE_DEFS.map(({ key, icon: Icon, accent }) => (
          <FeatureCard
            key={key}
            title={t(`items.${key}.title`)}
            description={t(`items.${key}.description`)}
            Icon={Icon}
            tag={t(`items.${key}.tag`)}
            accent={accent}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  Icon,
  tag,
  accent,
}: {
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  tag: string;
  accent: "lime" | "blue";
}) {
  const iconWrap =
    accent === "lime"
      ? "bg-[rgba(204,255,0,0.08)] text-bh-lime border-[rgba(204,255,0,0.22)]"
      : "bg-[rgba(0,194,255,0.08)] text-bh-blue border-[rgba(0,194,255,0.22)]";
  const tagClass =
    accent === "lime"
      ? "bg-[rgba(204,255,0,0.1)] text-bh-lime border-[rgba(204,255,0,0.22)]"
      : "bg-[rgba(0,194,255,0.1)] text-bh-blue border-[rgba(0,194,255,0.22)]";

  return (
    <article className="bh-card-lift flex h-full flex-col gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-bh-md border ${iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={`inline-flex items-center rounded-bh-pill border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagClass}`}
        >
          {tag}
        </span>
      </div>
      <h3 className="font-bh-heading text-lg font-bold leading-[1.2] text-bh-fg-1">
        {title}
      </h3>
      <p className="text-sm leading-[1.6] text-bh-fg-3">{description}</p>
    </article>
  );
}
