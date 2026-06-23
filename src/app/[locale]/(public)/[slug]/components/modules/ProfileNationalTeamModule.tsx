"use client";

import CountryFlag from "@/components/common/CountryFlag";
import type {
  NationalTeamAgeCategory,
  NationalTeamParticipation,
} from "@/db/schema/nationalTeams";

type Stint = {
  id: string;
  countryCode: string | null;
  teamName: string | null;
  crestUrl: string | null;
  ageCategory: NationalTeamAgeCategory;
  participation: NationalTeamParticipation;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
  highlights: string[];
  caps: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
};

type Photo = { id: string; url: string; altText: string | null };

export default function ProfileNationalTeamModule({
  stints,
  photos,
  labels,
}: {
  stints: Stint[];
  photos: Photo[];
  labels: {
    title: string;
    subtitle: string;
    current: string;
    ageCategory: Record<NationalTeamAgeCategory, string>;
    participation: Record<NationalTeamParticipation, string>;
  };
}) {
  return (
    <section id="national-team" className="mx-auto w-full max-w-[1180px] px-5 py-16 md:py-24">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bh-lime">
          {labels.subtitle}
        </p>
        <h2 className="mt-1 font-bh-display text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
          {labels.title}
        </h2>
      </header>

      <div className="space-y-4">
        {stints.map((s) => {
          const stats = (
            [
              ["PJ", s.caps],
              ["G", s.goals],
              ["A", s.assists],
              ["Min", s.minutes],
            ] as const
          ).filter(([, v]) => v != null);
          const period =
            s.startYear || s.endYear ? `${s.startYear ?? ""}–${s.endYear ?? labels.current}` : null;
          return (
            <article key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center gap-3">
                {s.crestUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.crestUrl} alt="" className="h-8 w-8 rounded object-contain" />
                ) : s.countryCode ? (
                  <CountryFlag code={s.countryCode} size={26} />
                ) : null}
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Selección {s.teamName ?? ""}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-bh-lime/15 px-2 py-0.5 font-medium text-bh-lime">
                      {labels.ageCategory[s.ageCategory]}
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                      {labels.participation[s.participation]}
                    </span>
                    {period ? <span className="text-white/50">{period}</span> : null}
                  </div>
                </div>
              </div>

              {s.description ? (
                <p className="mt-3 text-sm leading-relaxed text-white/70">{s.description}</p>
              ) : null}

              {s.highlights.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              ) : null}

              {stats.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/60">
                  {stats.map(([lbl, v]) => (
                    <span key={lbl}>
                      <span className="font-semibold text-white">{v}</span> {lbl}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {photos.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.url}
              alt={p.altText ?? "Selección Nacional"}
              loading="lazy"
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
