// CoachFreeLayout — public portfolio for free-tier coaches (DTs). Editorial
// dossier style, adapted from the player FreeLayout (same visual system: dark
// canvas, lime accents, § eyebrowed sections, hero with vitals strip, CountUp
// totals, identity card, external-link cards, lead-capture stub, inline footer
// with a Pro upsell). Server component; the only client bits are the sticky
// header (scroll-spy), the CountUp animations and the owner/visitor Pro slot.
//
// Sections in order:
//   1. Sticky pill header (CoachFreeHeader)
//   2. Hero (role pill · avatar · name · vital stats: edad/experiencia/esquema/club)
//   3. § 01 Filosofía & Bio (+ ficha card)
//   4. Video destacado (if an approved coach video exists)
//   5. § 02 Trayectoria (record totals + career rows + season table)
//   6. Pro slot — owner: 🔒 portfolio Pro · visitor: 📣 invitación a crear dossier
//   7. § 03 Licencias & Palmarés
//   8. § 04 Perfiles externos
//   9. § 05 Contacto (lead-capture stub)
//   10. Footer (logo + copyright + Pro upsell)

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Crest, DataRow, ExtIcon, Eyebrow, Flag, LockIcon, VitalCell } from "./atoms";
import CountUp, { CountBar } from "./CountUp";
import CoachFreeHeader from "./CoachFreeHeader";
import CoachProSlot from "./CoachProSlot";
import CoachLicenseList from "../CoachLicenseList";
import type { CoachPortfolioData } from "../CoachPortfolio";
import { methodologyIcon } from "@/lib/staff/methodology-icons";
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";
import { YouTube } from "@/components/icons/YoutubeIcon";

const SECTION_INNER = "mx-auto w-full max-w-[1180px]";

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export default async function CoachFreeLayout({
  data,
  ownerUserId = null,
}: {
  data: CoachPortfolioData;
  ownerUserId?: string | null;
}) {
  const { firstName, lastName } = splitName(data.fullName);
  const nationalities = (data.nationality ?? [])
    .map((c) => (c ?? "").toLowerCase())
    .filter((c) => /^[a-z]{2}$/.test(c));
  const video = data.media.find((m) => m.type === "video") ?? null;
  const yearNow = new Date().getFullYear();

  return (
    <div className="relative w-full overflow-hidden bg-bh-black text-bh-fg-1 font-body">
      {/* Ambient glow at top, subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-30"
        style={{
          background: "radial-gradient(60% 60% at 50% 0%, rgba(204,255,0,0.18) 0%, transparent 70%)",
        }}
      />

      <CoachFreeHeader fullName={data.fullName} avatarUrl={data.avatarUrl} />

      <div className="relative z-10">
        <Hero
          firstName={firstName}
          lastName={lastName}
          data={data}
          nationalities={nationalities}
          yearNow={yearNow}
        />

        <BioFicha data={data} nationalities={nationalities} />

        {video && <VideoFeature url={video.url} title={video.title} firstName={firstName} />}

        {data.career.length > 0 && <Career data={data} />}

        {data.methodology.length > 0 && <Methodology data={data} />}

        {/* Owner: 🔒 portfolio Pro · visitante: 📣 invitación */}
        <CoachProSlot ownerUserId={ownerUserId} side="right" />

        <LicensesHonours data={data} />

        <ExternalLinks links={data.links} />

        <Contact firstName={firstName} fullName={data.fullName} />

        <Footer year={yearNow} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Hero
// ---------------------------------------------------------------

async function Hero({
  firstName,
  lastName,
  data,
  nationalities,
  yearNow,
}: {
  firstName: string;
  lastName: string;
  data: CoachPortfolioData;
  nationalities: string[];
  yearNow: number;
}) {
  const t = await getTranslations("portfolio");
  const age = computeAge(data.birthDate);
  const birthFmt = formatBirthDate(data.birthDate);
  const expYears = data.coachingSince ? Math.max(0, yearNow - data.coachingSince) : null;
  // Esquema = idea de juego (sólo DT). Para oficios no-DT no aplica.
  const scheme = data.showTactical ? (data.preferredFormations?.[0] ?? null) : null;
  const role = data.roleDisplay?.trim() || data.roleTitle?.trim() || t("coach.free.roleFallback");

  return (
    <section className="px-5 pb-6 pt-28 md:px-10 md:pb-0 md:pt-32">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-[auto_1fr] md:gap-10">
          {/* Avatar with lime ring */}
          <div>
            <div
              className="relative h-[140px] w-[140px] overflow-hidden rounded-full border-2 border-white/[0.18] md:h-[200px] md:w-[200px]"
              style={{ boxShadow: "0 0 0 6px #080808, 0 0 0 7px #CCFF00" }}
            >
              <Image
                src={data.avatarUrl}
                alt={`${firstName} ${lastName}`}
                fill
                priority
                sizes="(max-width: 768px) 140px, 200px"
                className="object-cover"
                style={{ filter: "grayscale(0.15) contrast(1.05)" }}
              />
            </div>
            <div className="mt-3 inline-flex items-center gap-2 font-bh-mono text-[11px] text-bh-fg-3">
              <span className="h-1.5 w-1.5 rounded-full bg-bh-lime" />
              DT-FILE · STATUS: {t("free.statusActive")}
            </div>
          </div>

          {/* Role pill + nationalities + name */}
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-bh-lime px-2.5 py-1 font-bh-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-bh-black">
                {role}
              </span>
              {nationalities.length > 0 && (
                <div className="inline-flex items-center gap-1.5 pl-1">
                  {nationalities.map((c) => (
                    <Flag key={c} code={c} h={16} />
                  ))}
                  <span className="ml-1 font-body text-[11px] text-bh-fg-2">
                    {nationalities.map((c) => c.toUpperCase()).join(" / ")}
                  </span>
                </div>
              )}
            </div>

            <h1 className="font-bh-display text-6xl font-black uppercase leading-[0.88] tracking-[-0.01em] text-bh-fg-1 md:text-[112px]">
              {firstName}
              <br />
              <span className="font-bold italic text-bh-lime">{lastName}</span>
            </h1>
          </div>
        </div>

        {/* Vital stats strip */}
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.10] md:mt-10 md:grid-cols-4">
          <VitalCell
            label={t("free.vitalAge")}
            value={age ?? "—"}
            unit={age != null ? t("free.vitalAgeUnit") : undefined}
            sub={birthFmt ?? undefined}
          />
          <VitalCell
            label={t("coach.free.vitalExperience")}
            value={expYears ?? "—"}
            unit={expYears != null ? t("free.vitalAgeUnit") : undefined}
            sub={data.coachingSince ? t("coach.since", { year: data.coachingSince }) : undefined}
          />
          <VitalCell
            label={t("coach.free.vitalScheme")}
            valueRaw={scheme ?? "—"}
            sub={scheme ? t("coach.free.vitalSchemeSub") : undefined}
          />
          <VitalCell
            label={t("free.vitalCurrentClub")}
            valueRaw={
              <span className="inline-flex items-center gap-2">
                {data.currentClub && <Crest club={data.currentClub} size={26} />}
                <span className="text-[18px] leading-none md:text-[22px]">
                  {data.currentClub ?? t("free.noClub")}
                </span>
              </span>
            }
            sub={(data.nationality ?? []).join(" · ") || undefined}
            accentLabel
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// § 01 Filosofía & Bio + ficha
// ---------------------------------------------------------------

async function BioFicha({
  data,
  nationalities,
}: {
  data: CoachPortfolioData;
  nationalities: string[];
}) {
  const t = await getTranslations("portfolio");
  const residence = data.publicPersonalDetails?.residence ?? null;
  const education = data.publicPersonalDetails?.education ?? null;
  const languages = data.publicPersonalDetails?.languages ?? null;
  const hasFicha =
    nationalities.length > 0 ||
    (data.showTactical && (data.preferredFormations?.length ?? 0) > 0) ||
    !!data.coachingSince ||
    !!data.roleDisplay ||
    !!data.roleTitle ||
    !!residence ||
    !!education ||
    (languages?.length ?? 0) > 0;

  return (
    <section id="bio" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">§ 01</Eyebrow>
            <h2 className="mt-2 font-bh-display text-4xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {t("coach.free.philosophyTitleA")}
              <br />
              {t("coach.free.philosophyTitleB")}
            </h2>
          </div>
          <div className="space-y-6">
            <div>
              <Eyebrow className="mb-2.5 block">{t("coach.free.bioEyebrow")}</Eyebrow>
              <p className="m-0 whitespace-pre-line font-body text-sm leading-[1.7] text-bh-fg-1 md:text-base">
                {data.bio?.trim() ? data.bio : t("coach.free.bioEmpty")}
              </p>
            </div>
            {data.showTactical && data.playingStyle?.trim() && (
              <div>
                <Eyebrow className="mb-2.5 block">{t("coach.playingStyleTitle")}</Eyebrow>
                <p className="m-0 whitespace-pre-line font-body text-sm leading-[1.7] text-bh-fg-2 md:text-base">
                  {data.playingStyle}
                </p>
              </div>
            )}
          </div>
          {hasFicha && (
            <div>
              <Eyebrow className="mb-2.5 block">{t("coach.free.identityEyebrow")}</Eyebrow>
              <div className="rounded-xl border border-white/[0.10] bg-bh-surface-1">
                {data.roleDisplay?.trim() ? (
                  <DataRow label={t("coach.free.identityRole")}>{data.roleDisplay}</DataRow>
                ) : null}
                {data.coachingSince ? (
                  <DataRow label={t("coach.free.identityExperience")}>
                    {t("coach.since", { year: data.coachingSince })}
                  </DataRow>
                ) : null}
                {data.showTactical && data.preferredFormations?.length ? (
                  <DataRow label={t("coach.formationsTitle")} multiline>
                    <span className="inline-flex flex-wrap gap-1.5">
                      {data.preferredFormations.map((f) => (
                        <span
                          key={f}
                          className="rounded border border-bh-lime/30 bg-bh-lime/10 px-1.5 py-0.5 font-bh-mono text-[11px] font-semibold text-bh-lime"
                        >
                          {f}
                        </span>
                      ))}
                    </span>
                  </DataRow>
                ) : null}
                {nationalities.length > 0 && (
                  <DataRow label={t("coach.free.identityNationality")} last={!residence && !education && !(languages?.length)}>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {nationalities.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5">
                          <Flag code={c} h={11} />
                          <span className="font-bh-mono text-[11px] uppercase text-bh-fg-2">{c}</span>
                        </span>
                      ))}
                    </span>
                  </DataRow>
                )}
                {residence ? (
                  <DataRow label="Residencia" last={!education && !(languages?.length)}>
                    {residence}
                  </DataRow>
                ) : null}
                {education ? (
                  <DataRow label="Educación" last={!(languages?.length)}>
                    {education}
                  </DataRow>
                ) : null}
                {languages?.length ? (
                  <DataRow label="Idiomas" last>
                    {languages.join(", ")}
                  </DataRow>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Video destacado
// ---------------------------------------------------------------

function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{6,})/,
  );
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

async function VideoFeature({
  url,
  title,
  firstName,
}: {
  url: string;
  title: string | null;
  firstName: string;
}) {
  const t = await getTranslations("portfolio");
  const ytId = getYouTubeId(url);
  const vimeoId = !ytId ? getVimeoId(url) : null;
  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?dnt=1`
      : null;
  const displayTitle = title?.trim() || t("coach.videoFallback");

  return (
    <section id="video" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">{t("coach.free.videoEyebrow")}</Eyebrow>
            <h2 className="mt-2 font-bh-display text-3xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {firstName}
              <br />
              {t("coach.free.videoTitleSuffix")}
            </h2>
            <p className="mt-3 max-w-[260px] font-body text-[13px] leading-[1.55] text-bh-fg-3">
              {t("coach.free.videoCaption")}
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1">
            {embedSrc ? (
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src={embedSrc}
                  title={displayTitle}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 p-5 no-underline transition-colors hover:bg-white/[0.04] md:p-6"
              >
                <div className="min-w-0">
                  <div className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-fg-3">
                    {t("free.videoExternal")}
                  </div>
                  <div className="mt-1.5 truncate font-bh-display text-lg font-extrabold uppercase leading-tight text-bh-fg-1 md:text-2xl">
                    {displayTitle}
                  </div>
                  <div className="mt-1 truncate font-bh-mono text-[11px] text-bh-fg-3">{url}</div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bh-lime px-3.5 py-2 font-body text-[12px] font-semibold text-bh-black">
                  {t("free.videoWatch")} <ExtIcon size={13} />
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// § 02 Trayectoria (record totals + career rows + season table)
// ---------------------------------------------------------------

async function Career({ data }: { data: CoachPortfolioData }) {
  const t = await getTranslations("portfolio");
  const record = data.record;

  return (
    <section id="career" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4 md:mb-9">
          <div>
            <Eyebrow tone="accent">§ 02</Eyebrow>
            <h2 className="mt-2 font-bh-display text-4xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[56px]">
              {t("coach.careerTitle")}
            </h2>
          </div>
          <div className="font-body text-xs text-bh-fg-3">
            {t("coach.free.careerMeta", {
              stages: data.career.length,
              matches: record?.matches ?? 0,
            })}
          </div>
        </div>

        {/* Citable record passage — real text in the initial HTML for GEO. */}
        {record && record.matches > 0 && (
          <p className="mb-5 max-w-[760px] font-body text-sm leading-[1.7] text-bh-fg-2 md:text-base">
            {t("coach.recordSummary", {
              name: data.fullName,
              matches: record.matches,
              winRate: record.winPct,
              wins: record.wins,
              draws: record.draws,
              losses: record.losses,
            })}
          </p>
        )}

        {/* Record totals strip */}
        {record && record.matches > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.10] md:mb-8 md:grid-cols-5">
            <TotalCell label={t("coach.recordMatches")} value={record.matches} delay={0} />
            <TotalCell label={t("coach.recordWins")} value={record.wins} delay={100} tone="accent" />
            <TotalCell label={t("coach.recordDraws")} value={record.draws} delay={200} />
            <TotalCell label={t("coach.recordLosses")} value={record.losses} delay={300} />
            <TotalCell
              label={t("coach.recordWinRate")}
              value={record.winPct}
              delay={400}
              tone="accent"
              suffix="%"
            />
          </div>
        )}

        {/* Career rows */}
        <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1">
          {data.career.map((c, i) => {
            const period = c.endYear
              ? `${c.startYear ?? "—"} — ${c.endYear}`
              : `${c.startYear ?? "—"} — ${t("free.careerCurrentAbbr")}`;
            const isCurrent = !c.endYear && !!c.startYear;
            return (
              <div
                key={c.id}
                className={`grid grid-cols-1 items-center gap-3 px-3.5 py-4 md:grid-cols-[auto_1fr_auto] md:gap-6 md:px-5.5 md:py-5 ${i === data.career.length - 1 ? "" : "border-b border-white/[0.06]"}`}
              >
                <div className="flex items-center gap-3">
                  <Crest club={c.club} size={40} url={c.crestUrl} />
                  <div>
                    <div
                      className={`font-bh-mono text-[11px] font-semibold tracking-[0.05em] ${isCurrent ? "text-[#22C55E]" : "text-bh-fg-3"}`}
                    >
                      {isCurrent && (
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E] align-middle" />
                      )}
                      {period}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-bh-display text-[22px] font-extrabold uppercase leading-[1.05] text-bh-fg-1 md:text-[26px]">
                      <span>{c.club}</span>
                      {c.teamTransfermarktUrl && (
                        <a
                          href={c.teamTransfermarktUrl}
                          target="_blank"
                          rel="noreferrer nofollow"
                          aria-label={`${c.club} en Transfermarkt`}
                          title="Transfermarkt"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[#1E88E5] transition-opacity hover:opacity-80"
                        >
                          <TransfermarktIcon className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {c.roleLabels.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {c.roleLabels.map((label, ri) => (
                          <span
                            key={`${c.id}-role-${ri}`}
                            className="rounded border border-bh-lime/30 bg-bh-lime/10 px-1.5 py-0.5 font-bh-mono text-[11px] font-semibold uppercase tracking-[0.02em] text-bh-lime"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {(c.roleTitle || c.division) && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-body text-[13px] text-bh-fg-2">
                        {c.roleTitle && <span className="font-semibold">{c.roleTitle}</span>}
                        {c.division && <span className="text-bh-fg-3">· {c.division}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="hidden md:block" />
              </div>
            );
          })}
        </div>

        {/* Season-by-season record table */}
        {data.stats.length > 0 && (
          <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.10] bg-bh-surface-1">
            <table className="w-full min-w-[460px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.10] text-left font-bh-mono text-[11px] uppercase tracking-[0.06em] text-bh-fg-3">
                  <th className="px-4 py-3 font-semibold">{t("coach.seasonLabel")}</th>
                  <th className="px-2 py-3 text-center font-semibold">{t("coach.abbrMatches")}</th>
                  <th className="px-2 py-3 text-center font-semibold">{t("coach.abbrWins")}</th>
                  <th className="px-2 py-3 text-center font-semibold">{t("coach.abbrDraws")}</th>
                  <th className="px-2 py-3 text-center font-semibold">{t("coach.abbrLosses")}</th>
                  <th className="px-3 py-3 text-center font-semibold">{t("coach.abbrWinRate")}</th>
                </tr>
              </thead>
              <tbody>
                {data.stats.map((s, i) => (
                  <tr
                    key={s.id}
                    className={i === data.stats.length - 1 ? "" : "border-b border-white/[0.05]"}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bh-display text-[15px] font-bold uppercase text-bh-fg-1">
                        {s.season}
                      </span>
                      {s.team && <span className="ml-1.5 text-bh-fg-3">· {s.team}</span>}
                    </td>
                    <td className="px-2 py-3 text-center tabular-nums text-bh-fg-2">{s.matches}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-bh-fg-2">{s.wins}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-bh-fg-2">{s.draws}</td>
                    <td className="px-2 py-3 text-center tabular-nums text-bh-fg-2">{s.losses}</td>
                    <td className="px-3 py-3 text-center font-bh-display font-black tabular-nums text-bh-lime">
                      {pct(s.wins, s.matches)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function TotalCell({
  label,
  value,
  delay,
  tone = "default",
  suffix,
}: {
  label: string;
  value: number;
  delay: number;
  tone?: "default" | "accent";
  suffix?: string;
}) {
  return (
    <div className="relative bg-bh-surface-1 px-3 py-3.5 md:px-4.5 md:py-5">
      <div className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
        {label}
      </div>
      <div
        className={`flex items-baseline font-bh-display text-[28px] font-black leading-none md:text-[40px] ${tone === "accent" ? "text-bh-lime" : "text-bh-fg-1"}`}
      >
        <CountUp value={value} delay={delay} duration={1400} />
        {suffix ? <span className="text-[0.5em] font-bold">{suffix}</span> : null}
      </div>
      <CountBar delay={delay} duration={1400} />
    </div>
  );
}

// ---------------------------------------------------------------
// Metodología (universal — todos los oficios). Free: ≤2 rubros, sin archivos.
// ---------------------------------------------------------------

async function Methodology({ data }: { data: CoachPortfolioData }) {
  const t = await getTranslations("staff");
  return (
    <section id="methodology" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">{t("methodology.eyebrow")}</Eyebrow>
            <h2 className="mt-2 font-bh-display text-3xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {t("methodology.freeHeading")}
            </h2>
          </div>
          <div className="space-y-6">
            {data.methodology.map((r) => {
              const Icon = methodologyIcon(r.icon);
              return (
                <div key={r.id}>
                  <div className="mb-1.5 flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-bh-lime" aria-hidden />}
                    <h3 className="font-bh-display text-lg font-bold text-bh-fg-1">{r.title}</h3>
                  </div>
                  {r.body && (
                    <p className="m-0 whitespace-pre-line font-body text-sm leading-[1.7] text-bh-fg-2 md:text-base">
                      {r.body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// § 03 Licencias & Palmarés
// ---------------------------------------------------------------

async function LicensesHonours({ data }: { data: CoachPortfolioData }) {
  const t = await getTranslations("portfolio");
  if (data.licenses.length === 0 && data.honours.length === 0) return null;

  return (
    <section id="licenses" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">§ 03</Eyebrow>
            <h2 className="mt-2 font-bh-display text-3xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {t("coach.licensesTitle")}
              <br />
              <span className="text-bh-fg-3">&amp; {t("coach.honoursTitle")}</span>
            </h2>
          </div>
          <div className="space-y-6">
            {data.licenses.length > 0 && (
              <CoachLicenseList
                licenses={data.licenses.map((l) => ({
                  id: l.id,
                  title: l.title,
                  issuer: l.issuer,
                  year: l.year,
                  docUrl: l.docUrl,
                }))}
                verifiedLabel={t("coach.verified")}
              />
            )}
            {data.honours.length > 0 && (
              <ul className="space-y-2">
                {data.honours.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-white/[0.08] bg-bh-surface-1 px-4 py-3 font-body text-sm"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span aria-hidden className="text-bh-lime">★</span>
                      <span className="font-semibold text-bh-fg-1">{h.title}</span>
                      {(h.competition || h.season || h.careerLabel) && (
                        <span className="text-bh-fg-4">
                          · {[h.competition, h.season, h.careerLabel].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {h.videoUrl && (
                        <a
                          href={h.videoUrl}
                          target="_blank"
                          rel="noreferrer nofollow"
                          className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-bh-lime hover:underline"
                        >
                          <svg className="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Video
                        </a>
                      )}
                    </div>
                    {h.description && (
                      <p className="mt-1 text-[13px] leading-relaxed text-bh-fg-3">{h.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// § 04 Perfiles externos
// ---------------------------------------------------------------

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;
type ExtTheme = { label: string; subKey: string; labelKey?: string; color: string; mono: string; Icon?: IconCmp };

const EXT_THEMES: Record<string, ExtTheme> = {
  transfermarkt: { label: "Transfermarkt", subKey: "free.extTransfermarktSub", color: "#1E88E5", mono: "TM", Icon: TransfermarktIcon },
  instagram: { label: "Instagram", subKey: "free.extInstagramSub", color: "#E1306C", mono: "IG", Icon: Instagram },
  youtube: { label: "YouTube", subKey: "free.extYoutubeSub", color: "#FF0000", mono: "YT", Icon: YouTube },
  linkedin: { label: "LinkedIn", subKey: "free.extLinkedinSub", color: "#0A66C2", mono: "in", Icon: LinkedIn },
  twitter: { label: "X / Twitter", subKey: "free.extTwitterSub", color: "#1D9BF0", mono: "X" },
  custom: { label: "Sitio web", labelKey: "free.extCustomLabel", subKey: "free.extCustomSub", color: "#94A3B8", mono: "WW" },
};

function themeFor(kind: string): ExtTheme {
  return EXT_THEMES[(kind ?? "").toLowerCase()] ?? EXT_THEMES.custom;
}

async function ExternalLinks({ links }: { links: CoachPortfolioData["links"] }) {
  const t = await getTranslations("portfolio");
  const seen = new Set<string>();
  const clean = (links ?? []).filter((l) => {
    const key = (l.url ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (clean.length === 0) return null;

  return (
    <section id="links" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">§ 04</Eyebrow>
            <h2 className="mt-2 font-bh-display text-3xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {t("free.externalTitleA")}
              <br />
              {t("free.externalTitleB")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {clean.map((link, i) => {
              const theme = themeFor(link.kind);
              const Icon = theme.Icon;
              const fallbackLabel = theme.labelKey ? t(theme.labelKey) : theme.label;
              return (
                <a
                  key={`${link.kind}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex items-center gap-3 rounded-[10px] border border-white/[0.10] bg-bh-surface-1 p-3.5 no-underline transition-colors hover:border-white/[0.18]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bh-display text-sm font-black tracking-[0.04em]"
                    style={{ background: `${theme.color}20`, color: theme.color }}
                  >
                    {Icon ? <Icon className="h-5 w-5" aria-hidden style={{ fill: "currentColor" }} /> : theme.mono}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13px] font-medium text-bh-fg-1">
                      {link.label?.trim() || fallbackLabel}
                    </div>
                    <div className="truncate font-body text-[11px] text-bh-fg-3">{t(theme.subKey)}</div>
                  </div>
                  <span className="text-bh-fg-3">
                    <ExtIcon size={14} />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// § 05 Contacto lead-capture stub
// ---------------------------------------------------------------

async function Contact({ firstName, fullName }: { firstName: string; fullName: string }) {
  const t = await getTranslations("portfolio");
  return (
    <section id="contact" className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-12">
          <div>
            <Eyebrow tone="accent">§ 05</Eyebrow>
            <h2 className="mt-2 font-bh-display text-4xl font-black uppercase leading-[0.92] text-bh-fg-1 md:text-[64px]">
              {t("coach.free.contactTitleA")}
              <br />
              <span className="italic text-bh-lime">{firstName}</span>
            </h2>
            <p className="mt-4 max-w-[380px] font-body text-sm leading-[1.6] text-bh-fg-2">
              {t("coach.free.contactDescription", { name: fullName })}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1 p-5 md:p-7">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.06] px-2.5 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-fg-1">
              <LockIcon size={11} /> {t("free.contactLeadBadge")}
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2.5">
              <ContactStub label={t("free.contactEmail")} value="·· ·· ·· @ ·· ·· ··" />
              <ContactStub label={t("free.contactWhatsapp")} value="+54 ·· ···· ····" />
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              <FieldStub label={t("free.contactFieldName")} placeholder="Marcelo Bielsa" />
              <FieldStub label={t("free.contactFieldClub")} placeholder="Leeds United FC" />
              <FieldStub label={t("free.contactFieldEmail")} placeholder="contacto@club.com" />
              <button
                type="button"
                className="mt-1.5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-bh-lime px-3.5 py-3 font-body text-[13px] font-semibold text-bh-black"
              >
                {t("free.contactUnlock")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactStub({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.04] p-3">
      <div className="font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
        {label}
      </div>
      <div className="mt-1.5 font-bh-mono text-[13px] text-bh-fg-2" style={{ filter: "blur(3px)" }}>
        {value}
      </div>
    </div>
  );
}

function FieldStub({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <div className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
        {label}
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 font-body text-[13px] text-bh-fg-3">
        {placeholder}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Footer
// ---------------------------------------------------------------

async function Footer({ year }: { year: number }) {
  const t = await getTranslations("portfolio");
  return (
    <footer className="relative border-t border-white/[0.10] bg-[#050505] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <div className="font-bh-display text-lg font-black uppercase tracking-[0.04em] text-bh-fg-1 md:text-xl">
              &apos;BALLERSHUB
            </div>
            <p className="mt-2.5 max-w-[420px] font-body text-xs text-bh-fg-3">
              {t("coach.footerVerified")}
            </p>
            <div className="mt-3 flex flex-wrap gap-3.5 font-body text-[11px] text-bh-fg-3">
              <span>© {year} &apos;BallersHub</span>
              <span>·</span>
              <Link href="/legal/terms" className="text-bh-fg-2 no-underline">
                {t("free.footerTerms")}
              </Link>
              <Link href="/legal/privacy" className="text-bh-fg-2 no-underline">
                {t("free.footerPrivacy")}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-xl border border-bh-lime/30 bg-bh-lime/10 p-3 md:p-4">
            <div className="font-bh-display text-lg font-black uppercase tracking-[0.04em] text-bh-lime">
              Pro
            </div>
            <div className="font-body text-xs leading-[1.4] text-bh-fg-2">
              {t("coach.free.footerProBlurbA")}
              <br />
              {t("coach.free.footerProBlurbB")}
            </div>
            <Link
              href="/checkout/pro-coach?currency=ARS"
              className="inline-flex items-center justify-center rounded-full bg-bh-lime px-3.5 py-1.5 font-body text-xs font-semibold text-bh-black hover:bg-[#d8ff26]"
            >
              {t("coach.free.proActivate")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return { firstName: "Entrenador", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function computeAge(iso: string | null): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

function formatBirthDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d
      .toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
      .replace(".", "")
      .toUpperCase();
  } catch {
    return null;
  }
}
