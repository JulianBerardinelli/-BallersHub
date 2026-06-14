// FreeLayout — public portfolio for free-tier players. Editorial dossier
// style per the Claude Design handoff (see /tmp/portfolio-free-handoff for
// the original prototype). Server component; the only interactive bits are
// CountUp animations (client) and the share button (client).
//
// Sections in order:
//   1. Sticky pill header
//   2. Hero (eyebrows · avatar · name · vital stats)
//   3. § 01 Mindset & Bio (+ identidad card)
//   4. Pro slot 1 — owner: 🔒 Análisis táctico · visitor: 📣 invitación
//   5. § 02 Trayectoria (totals + career rows)
//   6. Pro slot 2 — owner: 🔒 Galería editorial · visitor: 📣 showcase
//   7. § 03 Perfiles externos
//   8. Pro slot 3 — owner: 🔒 Prensa & notas · visitor: 📣 agencias
//   9. § 04 Conectá con … (lead-capture stub)
//   10. Footer (logo + copyright + Pro upsell)
//
// The three Pro slots swap content by viewer (see ProSpot): the profile owner
// gets the "Activar Pro" LockedBanner upsell, everyone else gets BallersHub
// advertising (PromoBanner) inviting them to create their own profile.

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { localizeLanguages } from "@/lib/i18n/player-languages";
import {
  Crest,
  DataRow,
  ExtIcon,
  Eyebrow,
  Flag,
  LockIcon,
  VitalCell,
} from "./atoms";
import LockedBanner from "./LockedBanner";
import ProSpot from "./ProSpot";
import PromoBanner from "./PromoBanner";
import CountUp, { CountBar } from "./CountUp";
import { pillsFromPositions, type PositionPill } from "./positions";
import FreeHeader from "./FreeHeader";

// OwnerProUpgradeNudge pulls in the supabase browser client to verify the
// viewer's session matches the profile owner. Code-split it so the supabase
// JS only lands in the bundle for the (rare) Pro-sub-on-Free-layout case —
// the vast majority of Free portfolios are served by Free-sub players who
// never need this code path. Keeps the public portfolio JS lean for SEO
// and Core Web Vitals on LCP-sensitive entry points.
const OwnerProUpgradeNudge = dynamic(() => import("./OwnerProUpgradeNudge"));
import TransfermarktIcon from "@/components/icons/TransfermarktIcon";
import BeSoccerIcon from "@/components/icons/BeSoccerIcon";
import FlashscoreIcon from "@/components/icons/FlashscoreIcon";
import { Instagram } from "@/components/icons/InstagramIcon";
import { LinkedIn } from "@/components/icons/LinkedInIcon";
import { YouTube } from "@/components/icons/YoutubeIcon";

// Cap the editorial dossier at this width — anything wider gets dead
// whitespace on the sides on ultra-wide displays. 1180px lines up with
// our Pro layouts (max-w-7xl ≈ 1280 minus dossier gutters).
const SECTION_INNER = "mx-auto w-full max-w-[1180px]";

// ---------------------------------------------------------------
// Types — narrow shape consumed from the parent page.tsx. Anything we
// don't yet have in the DB is optional + skipped gracefully.
// ---------------------------------------------------------------

export type FreeLayoutLink = {
  kind: string;
  url: string;
  label?: string | null;
};

export type FreeLayoutVideo = {
  url: string;
  title: string | null;
  provider: string | null;
};

export type FreeLayoutPlayer = {
  id: string;
  slug: string;
  fullName: string;
  bio: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  foot: string | null;
  positions: string[] | null;
  nationality: string[] | null;
  nationalityCodes: string[] | null;
  currentClub: string | null;
  currentTeamCrestUrl: string | null;
  currentTeamCountryCode: string | null;
  currentDivisionName: string | null;
  currentDivisionCrestUrl: string | null;
  transfermarktUrl: string | null;
  beSoccerUrl: string | null;
  links: FreeLayoutLink[];
  contactEmail?: string | null;
};

export type FreeLayoutPersonal = {
  languages: string[] | null;
  education: string | null;
  residenceCity: string | null;
  residenceCountry: string | null;
  residenceCountryCode: string | null;
  whatsapp: string | null;
  showContactSection: boolean;
} | null;

export type FreeLayoutCareerRow = {
  id: string;
  club: string;
  countryCode: string | null;
  divisionName: string | null;
  divisionCrestUrl: string | null;
  // Categoría/liga adicional opcional (reserva, U20, equipo II, etc).
  secondaryDivisionName: string | null;
  secondaryDivisionCrestUrl: string | null;
  teamCrestUrl: string | null;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
  stats: {
    matches: number;
    starts: number;
    minutes: number;
    goals: number;
    assists: number;
  } | null;
};

export type FreeLayoutData = {
  player: FreeLayoutPlayer;
  personal: FreeLayoutPersonal;
  career: FreeLayoutCareerRow[];
  video: FreeLayoutVideo | null;
};

// ---------------------------------------------------------------
// Top-level layout
// ---------------------------------------------------------------

export default async function FreeLayout({
  data,
  ownerUserId = null,
  ownerProUpgradeNudgeUserId = null,
}: {
  data: FreeLayoutData;
  /**
   * The profile owner's user id. Drives the owner/visitor switch on the
   * interleaved Pro slots (see ProSpot): the owner sees their "Activar Pro"
   * upsell, every other viewer sees BallersHub advertising inviting them to
   * create their own profile. Ownership is resolved against the viewer's
   * session client-side because the page is ISR-cached. Null disables the
   * switch entirely — everyone gets the advertising.
   */
  ownerUserId?: string | null;
  /**
   * Renders a floating owner-only invitation to switch back to the Pro
   * Athlete layout. Pass the owner's userId only when the profile is
   * eligible (owner has Pro subscription AND theme.layout === "free");
   * pass null/undefined otherwise. The nudge itself does the client-side
   * session check so public visitors never see it. Keeping the prop null
   * for ineligible profiles means the component (and its supabase auth
   * roundtrip) is fully absent from the page.
   */
  ownerProUpgradeNudgeUserId?: string | null;
}) {
  const t = await getTranslations("portfolio");
  const { player, personal, career, video } = data;
  const { firstName, lastName } = splitName(player.fullName);
  const positionPills = pillsFromPositions(player.positions);
  const nationalities =
    (player.nationalityCodes ?? player.nationality ?? [])
      .map((c) => (c ?? "").toLowerCase())
      .filter(Boolean) ?? [];
  const totals = sumStats(career);
  const yearNow = new Date().getFullYear();

  return (
    <div className="relative w-full overflow-hidden bg-bh-black text-bh-fg-1 font-body">
      {/* Ambient glow at top, subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-30"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(204,255,0,0.18) 0%, transparent 70%)",
        }}
      />

      {/* ---------- Header (fixed nav with scroll-spy) ---------- */}
      <FreeHeader fullName={player.fullName} avatarUrl={player.avatarUrl} />

      <div className="relative z-10">
        {/* ---------- Hero ---------- */}
        <Hero
          firstName={firstName}
          lastName={lastName}
          avatarUrl={player.avatarUrl}
          positions={positionPills}
          nationalities={nationalities}
          birthDate={player.birthDate}
          heightCm={player.heightCm}
          weightKg={player.weightKg}
          foot={player.foot}
          currentClub={player.currentClub}
          currentTeamCrestUrl={player.currentTeamCrestUrl}
          currentTeamCountryCode={player.currentTeamCountryCode}
          division={player.currentDivisionName ?? career[0]?.divisionName ?? null}
        />

        {/* ---------- § 01 Mindset & Bio ---------- */}
        <BioIdentity
          bio={player.bio}
          personal={personal}
          nationalityCodes={nationalities}
        />

        {/* ---------- Video destacado (Free plan = 1 video) ---------- */}
        {video && <VideoFeature video={video} firstName={firstName} />}

        {/* ---------- Slot 1 — owner: 🔒 Análisis táctico · visitante: 📣 invitación ---------- */}
        <ProSpot
          ownerUserId={ownerUserId}
          promo={<PromoBanner variant="player" side="right" />}
          locked={
            <LockedBanner
              side="right"
              eyebrow={t("free.slotTacticsEyebrow")}
              title={
                <>
                  {t("free.slotTacticsTitleA")}<br />
                  {t("free.slotTacticsTitleB")}
                </>
              }
              subtitle={t("free.slotTacticsSubtitle")}
              preview="tactics"
            />
          }
        />

        {/* ---------- § 02 Trayectoria ---------- */}
        {career.length > 0 && <Career career={career} totals={totals} />}

        {/* ---------- Slot 2 — owner: 🔒 Galería editorial · visitante: 📣 showcase ---------- */}
        <ProSpot
          ownerUserId={ownerUserId}
          promo={<PromoBanner variant="showcase" side="left" />}
          locked={
            <LockedBanner
              side="left"
              eyebrow={t("free.slotGalleryEyebrow")}
              title={
                <>
                  {t("free.slotGalleryTitleA")}
                  <br />
                  {t("free.slotGalleryTitleB")}
                </>
              }
              subtitle={t("free.slotGallerySubtitle")}
              preview="gallery"
            />
          }
        />

        {/* ---------- § 03 Perfiles externos ---------- */}
        <ExternalLinks player={player} />

        {/* ---------- Slot 3 — owner: 🔒 Prensa & notas · visitante: 📣 agencias ---------- */}
        <ProSpot
          ownerUserId={ownerUserId}
          promo={<PromoBanner variant="agency" side="right" />}
          locked={
            <LockedBanner
              side="right"
              eyebrow={t("free.slotPressEyebrow")}
              title={
                <>
                  {t("free.slotPressTitleA")}
                  <br />
                  {t("free.slotPressTitleB")}
                </>
              }
              subtitle={t("free.slotPressSubtitle")}
              preview="press"
            />
          }
        />

        {/* ---------- § 04 Contact lead-capture stub ---------- */}
        {personal?.showContactSection && (
          <Contact firstName={firstName} />
        )}

        {/* ---------- Footer ---------- */}
        <Footer fullName={player.fullName} year={yearNow} />
      </div>

      {/* Owner-only floating nudge — only mounted when the parent confirms
          the profile is eligible (owner has Pro subscription AND chose
          theme.layout === "free"). The component itself does the
          client-side session check so public visitors never see it. */}
      {ownerProUpgradeNudgeUserId ? (
        <OwnerProUpgradeNudge ownerUserId={ownerProUpgradeNudgeUserId} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------
// Hero
// ---------------------------------------------------------------

async function Hero({
  firstName,
  lastName,
  avatarUrl,
  positions,
  nationalities,
  birthDate,
  heightCm,
  weightKg,
  foot,
  currentClub,
  currentTeamCrestUrl,
  currentTeamCountryCode,
  division,
}: {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  positions: PositionPill[];
  nationalities: string[];
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  foot: string | null;
  currentClub: string | null;
  currentTeamCrestUrl: string | null;
  currentTeamCountryCode: string | null;
  division: string | null;
}) {
  const t = await getTranslations("portfolio");
  const age = computeAge(birthDate);
  const birthFmt = formatBirthDate(birthDate);

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
              {/* Free hero avatar = the Free-layout LCP. next/image fill +
                  priority (above the fold) → AVIF/WebP at 140–200px instead of
                  a full-size raw avatar. The parent is the sized, rounded box. */}
              <Image
                src={avatarUrl ?? "/images/player-default.jpg"}
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
              FILE №&nbsp;000000 · STATUS: {t("free.statusActive")}
            </div>
          </div>

          {/* Position pills + nationalities + name */}
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {positions.map((p) => (
                <span
                  key={p.code}
                  className="inline-flex items-center gap-1.5 rounded bg-bh-lime px-2.5 py-1 font-bh-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-bh-black"
                >
                  <span className="opacity-90">{p.code}</span>
                  <span className="opacity-60">·</span>
                  <span>{p.label}</span>
                </span>
              ))}
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
            label={t("free.vitalPhysical")}
            valueRaw={
              <span className="tabular-nums">
                {heightCm ?? "—"}
                <span className="mr-1 text-[0.55em] font-semibold text-bh-fg-3">
                  {" "}
                  cm
                </span>
                <span className="mx-1 text-bh-fg-4">·</span>
                {weightKg ?? "—"}
                <span className="text-[0.55em] font-semibold text-bh-fg-3"> kg</span>
              </span>
            }
            sub={t("free.vitalPhysicalSub")}
          />
          <VitalCell
            label={t("free.vitalFoot")}
            valueRaw={foot ?? "—"}
            sub={
              foot
                ? foot.toLowerCase().startsWith("der")
                  ? t("free.vitalFootSubRight")
                  : t("free.vitalFootSubLeft")
                : undefined
            }
          />
          <VitalCell
            label={t("free.vitalCurrentClub")}
            valueRaw={
              <span className="inline-flex items-center gap-2">
                {(currentTeamCrestUrl || currentClub) && (
                  <Crest
                    club={currentClub ?? ""}
                    size={26}
                    url={currentTeamCrestUrl}
                  />
                )}
                <span className="text-[18px] leading-none md:text-[22px]">
                  {currentClub ?? t("free.noClub")}
                </span>
              </span>
            }
            sub={
              [
                currentTeamCountryCode ? currentTeamCountryCode.toUpperCase() : null,
                division,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
            }
            accentLabel
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// § 01 Mindset & Bio + identity
// ---------------------------------------------------------------

async function BioIdentity({
  bio,
  personal,
  nationalityCodes,
}: {
  bio: string | null;
  personal: FreeLayoutPersonal;
  nationalityCodes: string[];
}) {
  const t = await getTranslations("portfolio");
  const locale = (await getLocale()) as Locale;
  const hasIdentityRows =
    !!personal &&
    (personal.languages?.length ||
      personal.education ||
      personal.residenceCity ||
      personal.residenceCountry ||
      nationalityCodes.length > 0);

  return (
    <section
      id="bio"
      className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14"
    >
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">§ 01</Eyebrow>
            <h2 className="mt-2 font-bh-display text-4xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {t("free.bioTitleA")}
              <br />{t("free.bioTitleB")}
            </h2>
          </div>
          <div>
            <Eyebrow className="mb-2.5 block">{t("free.bioEyebrow")}</Eyebrow>
            <p className="m-0 font-body text-sm leading-[1.7] text-bh-fg-1 md:text-base">
              {bio?.trim()
                ? bio
                : t("free.bioEmpty")}
            </p>
          </div>
          {hasIdentityRows && (
            <div>
              <Eyebrow className="mb-2.5 block">{t("free.identityEyebrow")}</Eyebrow>
              <div className="rounded-xl border border-white/[0.10] bg-bh-surface-1">
                {personal?.languages?.length ? (
                  <DataRow label={t("free.identityLanguages")}>
                    {localizeLanguages(personal.languages, locale).join(" · ")}
                  </DataRow>
                ) : null}
                {personal?.education ? (
                  <DataRow label={t("free.identityEducation")} multiline>
                    {personal.education}
                  </DataRow>
                ) : null}
                {(personal?.residenceCity || personal?.residenceCountry) && (
                  <DataRow label={t("free.identityResidence")}>
                    <span className="inline-flex items-center gap-2">
                      {personal?.residenceCountryCode && (
                        <Flag
                          code={personal.residenceCountryCode}
                          h={11}
                        />
                      )}
                      {[personal?.residenceCity, personal?.residenceCountry]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </DataRow>
                )}
                {nationalityCodes.length > 0 && (
                  <DataRow label={t("free.identityPassport")} last>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {nationalityCodes.map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Flag code={c} h={11} />
                          <span className="font-bh-mono text-[11px] uppercase text-bh-fg-2">
                            {c}
                          </span>
                        </span>
                      ))}
                    </span>
                  </DataRow>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------
// Video destacado — Free plan allows 1 approved video (or a highlight
// link). Renders a YouTube embed when possible, otherwise a fallback
// CTA card that opens the source in a new tab.
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
  video,
  firstName,
}: {
  video: FreeLayoutVideo;
  firstName: string;
}) {
  const t = await getTranslations("portfolio");
  const ytId = getYouTubeId(video.url);
  const vimeoId = !ytId ? getVimeoId(video.url) : null;
  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?dnt=1`
      : null;
  const title = video.title?.trim() || t("free.videoFeatured");

  return (
    <section
      id="video"
      className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14"
    >
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">{t("free.videoEyebrow")}</Eyebrow>
            <h2 className="mt-2 font-bh-display text-3xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {firstName}
              <br />
              {t("free.videoTitleSuffix")}
            </h2>
            <p className="mt-3 max-w-[260px] font-body text-[13px] leading-[1.55] text-bh-fg-3">
              {ytId || vimeoId
                ? t("free.videoCaptionEmbed")
                : t("free.videoCaptionLink")}
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1">
            {embedSrc ? (
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src={embedSrc}
                  title={title}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            ) : (
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-4 p-5 no-underline transition-colors hover:bg-white/[0.04] md:p-6"
              >
                <div className="min-w-0">
                  <div className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-fg-3">
                    {video.provider?.toUpperCase() ?? t("free.videoExternal")}
                  </div>
                  <div className="mt-1.5 truncate font-bh-display text-lg font-extrabold uppercase leading-tight text-bh-fg-1 md:text-2xl">
                    {title}
                  </div>
                  <div className="mt-1 truncate font-bh-mono text-[11px] text-bh-fg-3">
                    {video.url}
                  </div>
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
// § 02 Trayectoria
// ---------------------------------------------------------------

async function Career({
  career,
  totals,
}: {
  career: FreeLayoutCareerRow[];
  totals: ReturnType<typeof sumStats>;
}) {
  const t = await getTranslations("portfolio");
  const totalsCells: Array<[string, number, number, "default" | "accent" | "blue"]> = [
    [t("free.totalMatches"), totals.matches, 0, "default"],
    [t("free.totalStarts"), totals.starts, 100, "default"],
    [t("free.totalMinutes"), totals.minutes, 200, "default"],
    [t("free.totalGoals"), totals.goals, 300, "accent"],
    [t("free.totalAssists"), totals.assists, 400, "default"],
  ];

  return (
    <section
      id="career"
      className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14"
    >
      <div className={SECTION_INNER}>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4 md:mb-9">
          <div>
            <Eyebrow tone="accent">§ 02</Eyebrow>
            <h2 className="mt-2 font-bh-display text-4xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[56px]">
              {t("free.careerTitle")}
            </h2>
          </div>
          <div className="font-body text-xs text-bh-fg-3">
            {t("free.careerMeta", {
              stages: career.length,
              withStats: career.filter((c) => c.stats).length,
            })}
          </div>
        </div>

        {/* Totals strip */}
        <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.10] md:mb-8 md:grid-cols-5">
          {totalsCells.map(([label, value, delay, tone]) => (
            <div
              key={label}
              className="relative bg-bh-surface-1 px-3 py-3.5 md:px-4.5 md:py-5"
            >
              <div className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
                {label}
              </div>
              <CountUp
                value={value}
                delay={delay}
                duration={1400}
                className={`block font-bh-display text-[28px] font-black leading-none md:text-[40px] ${tone === "accent" ? "text-bh-lime" : tone === "blue" ? "text-bh-blue" : "text-bh-fg-1"}`}
              />
              <CountBar delay={delay} duration={1400} />
            </div>
          ))}
        </div>

        {/* Career rows */}
        <div className="overflow-hidden rounded-xl border border-white/[0.10] bg-bh-surface-1">
          {career.map((c, i) => (
            <CareerRow
              key={c.id}
              item={c}
              index={i}
              last={i === career.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

async function CareerRow({
  item,
  index,
  last,
}: {
  item: FreeLayoutCareerRow;
  index: number;
  last: boolean;
}) {
  const t = await getTranslations("portfolio");
  const period = item.endYear
    ? `${item.startYear ?? "—"} — ${item.endYear}`
    : `${item.startYear ?? "—"} — ${t("free.careerCurrentAbbr")}`;
  const baseDelay = 200 + index * 80;

  return (
    <div
      className={`grid grid-cols-1 items-center gap-3 px-3.5 py-4 md:grid-cols-[auto_1.2fr_1fr] md:gap-6 md:px-5.5 md:py-5 ${last ? "" : "border-b border-white/[0.06]"}`}
    >
      <div className="flex items-center gap-3">
        <Crest club={item.club} size={40} url={item.teamCrestUrl} />
        <div>
          <div
            className={`font-bh-mono text-[11px] font-semibold tracking-[0.05em] ${item.isCurrent ? "text-[#22C55E]" : "text-bh-fg-3"}`}
          >
            {item.isCurrent && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#22C55E] align-middle" />
            )}
            {period}
          </div>
          <div className="mt-0.5 font-bh-display text-[22px] font-extrabold uppercase leading-[1.05] text-bh-fg-1 md:text-[26px]">
            {item.club}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-body text-[13px] text-bh-fg-2">
            {item.divisionCrestUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.divisionCrestUrl}
                alt=""
                width={44}
                height={44}
                loading="lazy"
                className="object-contain"
                style={{ width: 44, height: 44 }}
              />
            ) : item.countryCode ? (
              <Flag code={item.countryCode} h={14} />
            ) : null}
            <span className="font-semibold">
              {item.divisionName ?? t("free.noLeague")}
            </span>
            {item.countryCode && item.divisionCrestUrl ? (
              <Flag code={item.countryCode} h={12} />
            ) : null}
            {item.secondaryDivisionName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-bh-fg-3">
                <span className="text-bh-fg-4">+</span>
                {item.secondaryDivisionCrestUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.secondaryDivisionCrestUrl}
                    alt=""
                    width={16}
                    height={16}
                    loading="lazy"
                    className="object-contain"
                    style={{ width: 16, height: 16 }}
                  />
                ) : null}
                <span>{item.secondaryDivisionName}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="hidden md:block" />

      {item.stats ? (
        <div className="grid grid-cols-5 gap-1 border-t border-white/[0.06] pt-2.5 md:gap-2 md:border-t-0 md:pt-0">
          {[
            [t("free.statMatchesAbbr"), item.stats.matches, "default", 0],
            [t("free.statStartsAbbr"), item.stats.starts, "default", 60],
            [t("free.statMinutesAbbr"), item.stats.minutes, "default", 120],
            [t("free.statGoalsAbbr"), item.stats.goals, "accent", 180],
            [t("free.statAssistsAbbr"), item.stats.assists, "blue", 240],
          ].map(([k, v, tone, off]) => (
            <div key={String(k)} className="text-center">
              <CountUp
                value={Number(v)}
                delay={baseDelay + Number(off)}
                duration={1100}
                className={`block font-bh-display text-lg font-black leading-none md:text-[22px] ${tone === "accent" ? "text-bh-lime" : tone === "blue" ? "text-bh-blue" : "text-bh-fg-1"}`}
              />
              <div className="mt-1 font-body text-[9px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3">
                {String(k)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-white/[0.06] pt-2.5 font-body text-xs italic text-bh-fg-3 md:border-t-0 md:pt-0">
          {t("free.careerNoStats")}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// § 03 External profiles
// ---------------------------------------------------------------

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

type ExtTheme = {
  label: string;
  /**
   * i18n key (under the `portfolio.free` namespace) for the descriptive
   * subtitle. Resolved at render time so the copy is localized.
   */
  subKey: string;
  /**
   * i18n key for the label, only used by the `custom` fallback. Brand-named
   * providers keep their proper-noun `label` verbatim.
   */
  labelKey?: string;
  color: string;
  /** Monogram fallback when no Icon is supplied (or for unknown kinds). */
  mono: string;
  Icon?: IconCmp;
};

const EXT_THEMES: Record<string, ExtTheme> = {
  transfermarkt: {
    label: "Transfermarkt",
    subKey: "free.extTransfermarktSub",
    color: "#1E88E5",
    mono: "TM",
    Icon: TransfermarktIcon,
  },
  besoccer: {
    label: "BeSoccer",
    subKey: "free.extBeSoccerSub",
    color: "#00e676",
    mono: "BS",
    Icon: BeSoccerIcon,
  },
  flashscore: {
    label: "Flashscore",
    subKey: "free.extFlashscoreSub",
    color: "#F2A917",
    mono: "FS",
    Icon: FlashscoreIcon,
  },
  instagram: {
    label: "Instagram",
    subKey: "free.extInstagramSub",
    color: "#E1306C",
    mono: "IG",
    Icon: Instagram,
  },
  youtube: {
    label: "YouTube",
    subKey: "free.extYoutubeSub",
    color: "#FF0000",
    mono: "YT",
    Icon: YouTube,
  },
  linkedin: {
    label: "LinkedIn",
    subKey: "free.extLinkedinSub",
    color: "#0A66C2",
    mono: "in",
    Icon: LinkedIn,
  },
  highlight: {
    label: "Highlights",
    subKey: "free.extHighlightSub",
    color: "#FF0000",
    mono: "HL",
    Icon: YouTube,
  },
  tiktok: {
    label: "TikTok",
    subKey: "free.extTiktokSub",
    color: "#69C9D0",
    mono: "TT",
  },
  twitter: {
    label: "X / Twitter",
    subKey: "free.extTwitterSub",
    color: "#1D9BF0",
    mono: "X",
  },
  custom: {
    label: "Sitio web",
    labelKey: "free.extCustomLabel",
    subKey: "free.extCustomSub",
    color: "#94A3B8",
    mono: "WW",
  },
};

function themeFor(kind: string): ExtTheme {
  const key = kind.toLowerCase();
  return EXT_THEMES[key] ?? EXT_THEMES.custom;
}

async function ExternalLinks({ player }: { player: FreeLayoutPlayer }) {
  const t = await getTranslations("portfolio");
  // Combine legacy `player_profiles.{transfermarkt,besoccer}_url` columns
  // with the rich `player_links` table. player_links takes priority — when
  // the same URL exists in both, we keep the curated label from the table.
  // Dedupe by URL so a transfermarkt entry doesn't appear twice.
  const seenUrls = new Set<string>();
  const links: FreeLayoutLink[] = [];

  for (const link of player.links ?? []) {
    if (!link?.url) continue;
    const key = link.url.trim().toLowerCase();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    links.push({
      kind: (link.kind ?? "custom").toLowerCase(),
      url: link.url,
      label: link.label ?? null,
    });
  }

  for (const [kind, url] of [
    ["transfermarkt", player.transfermarktUrl],
    ["besoccer", player.beSoccerUrl],
  ] as const) {
    if (!url) continue;
    const key = url.trim().toLowerCase();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    links.push({ kind, url });
  }

  if (links.length === 0) return null;

  return (
    <section
      id="links"
      className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14"
    >
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-10">
          <div>
            <Eyebrow tone="accent">§ 03</Eyebrow>
            <h2 className="mt-2 font-bh-display text-3xl font-black uppercase leading-[0.95] text-bh-fg-1 md:text-[44px]">
              {t("free.externalTitleA")}
              <br />
              {t("free.externalTitleB")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((link, i) => {
              const theme = themeFor(link.kind);
              const Icon = theme.Icon;
              const fallbackLabel = theme.labelKey
                ? t(theme.labelKey)
                : theme.label;
              return (
                <a
                  key={`${link.kind}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-[10px] border border-white/[0.10] bg-bh-surface-1 p-3.5 no-underline transition-colors hover:border-white/[0.18]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-bh-display text-sm font-black tracking-[0.04em]"
                    style={{
                      background: `${theme.color}20`,
                      color: theme.color,
                    }}
                  >
                    {Icon ? (
                      <Icon
                        className="h-5 w-5"
                        aria-hidden
                        style={{ fill: "currentColor" }}
                      />
                    ) : (
                      theme.mono
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-body text-[13px] font-medium text-bh-fg-1">
                      {link.label?.trim() || fallbackLabel}
                    </div>
                    <div className="truncate font-body text-[11px] text-bh-fg-3">
                      {t(theme.subKey)}
                    </div>
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
// § 04 Contact lead-capture stub
// ---------------------------------------------------------------

async function Contact({ firstName }: { firstName: string }) {
  const t = await getTranslations("portfolio");
  return (
    <section
      id="contact"
      className="border-t border-white/[0.10] px-5 py-8 md:px-10 md:py-14"
    >
      <div className={SECTION_INNER}>
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-12">
          <div>
            <Eyebrow tone="accent">§ 04</Eyebrow>
            <h2 className="mt-2 font-bh-display text-4xl font-black uppercase leading-[0.92] text-bh-fg-1 md:text-[64px]">
              {t("free.contactTitle")}
              <br />
              <span className="italic text-bh-lime">{firstName}</span>
            </h2>
            <p className="mt-4 max-w-[380px] font-body text-sm leading-[1.6] text-bh-fg-2">
              {t("free.contactDescription")}
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
              <FieldStub label={t("free.contactFieldEmail")} placeholder="m.bielsa@club.com" />
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
      <div
        className="mt-1.5 font-bh-mono text-[13px] text-bh-fg-2"
        style={{ filter: "blur(3px)" }}
      >
        {value}
      </div>
    </div>
  );
}

function FieldStub({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
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

async function Footer({ fullName, year }: { fullName: string; year: number }) {
  const t = await getTranslations("portfolio");
  return (
    <footer className="relative border-t border-white/[0.10] bg-[#050505] px-5 py-8 md:px-10 md:py-14">
      <div className={SECTION_INNER}>
        <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <div className="font-bh-display text-lg font-black uppercase tracking-[0.04em] text-bh-fg-1 md:text-xl">
              &apos;BALLERSHUB
            </div>
            <p className="mt-2.5 max-w-[380px] font-body text-xs text-bh-fg-3">
              {t("free.footerTaglinePre", { name: fullName })}
              &apos;BallersHub{t("free.footerTaglinePost")}
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
              {t("free.footerProBlurbA")}
              <br />
              {t("free.footerProBlurbB")}
            </div>
            <Link
              href="/pricing?audience=player&currency=ARS"
              className="inline-flex items-center justify-center rounded-full bg-bh-lime px-3.5 py-1.5 font-body text-xs font-semibold text-bh-black hover:bg-[#d8ff26]"
            >
              {t("free.footerActivatePro")}
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
  if (!trimmed) return { firstName: "Jugador", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
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
      .toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "")
      .toUpperCase();
  } catch {
    return null;
  }
}

function sumStats(career: FreeLayoutCareerRow[]) {
  return career.reduce(
    (acc, c) => {
      if (!c.stats) return acc;
      acc.matches += c.stats.matches ?? 0;
      acc.starts += c.stats.starts ?? 0;
      acc.minutes += c.stats.minutes ?? 0;
      acc.goals += c.stats.goals ?? 0;
      acc.assists += c.stats.assists ?? 0;
      return acc;
    },
    { matches: 0, starts: 0, minutes: 0, goals: 0, assists: 0 },
  );
}
