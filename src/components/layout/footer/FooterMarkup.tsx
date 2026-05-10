import Link from "next/link";
import { ArrowUpRight, Globe, Instagram, Linkedin } from "lucide-react";

import AnimatedStat from "./AnimatedStat";
import NewsletterForm from "./NewsletterForm";

export type FooterTheme = {
  /** Background of the whole footer. */
  bg: string;
  /** Primary accent (used for highlights, primary CTA, stats lime side). */
  accent: string;
  /** Secondary accent (stats alt color, newsletter when alt requested). */
  accent2: string;
  /** Color used as the foreground inside accent pills/buttons (must contrast accent). */
  accentFg: string;
  /** Top-level foreground text color. */
  fg1: string;
  /** Muted foreground (paragraphs). */
  fg2: string;
  /** More muted foreground (eyebrows, helpers). */
  fg3: string;
  /** Most muted foreground (separators, decorations). */
  fg4: string;
  /** Subtle border color. */
  border1: string;
  /** Default border color. */
  border2: string;
  /** Strong border color (used in secondary outlined buttons). */
  border3: string;
  /** Semi-transparent surface for chip-like elements. */
  surfaceSoft: string;
  /** Display font (uppercase headings, big numbers). */
  displayFont: string;
  /** Body font. */
  bodyFont: string;
  /** Mono font (eyebrows, technical labels). */
  monoFont: string;
  /** rgba glow for accent (for shadows). */
  accentGlow: string;
  /** rgba dim of accent (used for chips, pills). */
  accentDim: string;
  /** rgba border of accent (used for chips, pills). */
  accentBorder: string;
};

export type FooterCTA = {
  label: string;
  href: string;
  variant?: "primary" | "outline";
};

export type FooterLinkItem = { label: string; href: string; badge?: string };
export type FooterLinkColumn = { title: string; links: FooterLinkItem[] };

export type FooterAuthState = {
  isAuthenticated: boolean;
  isPlayer: boolean;
  isManager: boolean;
  hasPlayerProfile: boolean;
  playerSlug: string | null;
  agencySlug: string | null;
  hasActiveApplication: boolean;
};

export type FooterProps = {
  theme: FooterTheme;
  /** Stat cards. Length expected to be 4 for ideal layout. */
  stats?: Array<{ value: string; label: string; useAlt?: boolean }>;
  /** Pre-resolved CTA buttons. The component does not infer them itself. */
  ctas?: FooterCTA[];
  /** Eyebrow shown above the main headline. */
  eyebrow?: string;
  /** Headline. The portion wrapped in a span is colored with the accent. */
  headline?: { lead: string; highlight: string };
  /** Subheadline copy. */
  subheadline?: string;
  /** Newsletter accent override (defaults to theme.accent2). */
  newsletterAccent?: string;
  /** Show "Desarrollado por Julián Berardinelli" line. */
  showCredits?: boolean;
  /**
   * Optional link columns. If omitted, the component falls back to the
   * default 3-column layout. Pass `[]` to render no link columns.
   */
  linkColumns?: FooterLinkColumn[];
  /**
   * Render a `border-top` over the whole footer. Useful for the global site
   * footer where the page background and the footer's striped pattern would
   * otherwise visually clash. The portfolio footer leaves this off.
   */
  showTopBorder?: boolean;
};

const DEFAULT_STATS: NonNullable<FooterProps["stats"]> = [
  { value: "+1.2K", label: "Perfiles validados" },
  { value: "86", label: "Clubes activos", useAlt: true },
  { value: "4.8/5", label: "Reseñas verificadas" },
  { value: "12", label: "Países", useAlt: true },
];

const PRODUCT_LINKS = [
  { label: "Crear perfil", href: "/onboarding/start" },
  { label: "Validación", href: "/players" },
  { label: "Trayectoria", href: "/dashboard/edit-profile/football-data" },
  { label: "Plantillas Pro", href: "/dashboard/edit-template/styles" },
];

const CLUB_LINKS = [
  { label: "Scouting AI", href: "/scouting", badge: "Beta" },
  { label: "Shortlists", href: "/players" },
  { label: "Reseñas", href: "/about" },
  { label: "Demo", href: "/about" },
];

const WORK_LINKS = [
  { label: "Carreras", href: "/about", badge: "Hiring" },
  { label: "Partners", href: "/about" },
  { label: "Embajadores", href: "/about" },
  { label: "Prensa", href: "/about" },
];

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
  if (!m) return `rgba(255,255,255,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ColumnTitle({ theme, children }: { theme: FooterTheme; children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: theme.displayFont,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: theme.fg3,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function LinkColumn({
  theme,
  title,
  links,
}: {
  theme: FooterTheme;
  title: string;
  links: Array<{ label: string; href: string; badge?: string }>;
}) {
  return (
    <div>
      <ColumnTitle theme={theme}>{title}</ColumnTitle>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              style={{
                fontFamily: theme.bodyFont,
                fontSize: 13,
                color: theme.fg2,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {l.label}
              {l.badge && (
                <span
                  style={{
                    fontFamily: theme.monoFont,
                    fontSize: 9,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: theme.accentDim,
                    color: theme.accent,
                    border: `1px solid ${theme.accentBorder}`,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {l.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialButton({
  theme,
  href,
  label,
  icon,
}: {
  theme: FooterTheme;
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${theme.border2}`,
        color: theme.fg2,
        textDecoration: "none",
        fontFamily: theme.bodyFont,
        fontSize: 12,
        fontWeight: 500,
        transition: "all 160ms cubic-bezier(0.25,0,0,1)",
      }}
    >
      {icon}
      {label}
    </a>
  );
}

function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9z" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  );
}

const DEFAULT_LINK_COLUMNS: FooterLinkColumn[] = [
  { title: "Para Jugadores", links: PRODUCT_LINKS },
  { title: "Para Agencias", links: CLUB_LINKS },
  { title: "Trabajar", links: WORK_LINKS },
];

export default function FooterMarkup({
  theme,
  stats = DEFAULT_STATS,
  ctas,
  eyebrow = "En vivo · 86 clubes activos",
  headline = {
    lead: "Subí, validá y ",
    highlight: "jugá donde importa.",
  },
  subheadline = "Más de 1.200 perfiles validados. Reseñas de cuerpo técnico verificadas. Tu próximo club te está buscando.",
  newsletterAccent,
  showCredits = true,
  linkColumns = DEFAULT_LINK_COLUMNS,
  showTopBorder = false,
}: FooterProps) {
  const newsletterColor = newsletterAccent || theme.accent2;
  const megaCols = `minmax(0, 1.4fr) ${"minmax(0, 1fr) ".repeat(linkColumns.length)}minmax(0, 1fr)`;

  return (
    <>
      <style>{`
        .bh-fmark-hero { padding: 56px 0; }
        .bh-fmark-hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
          gap: 48px;
          align-items: center;
        }
        .bh-fmark-hero-eyebrow { white-space: nowrap; }
        .bh-fmark-hero-headline { font-size: 38px; }
        .bh-fmark-cta-btn { padding: 16px 24px; font-size: 16px; }
        .bh-fmark-stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 40px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .bh-fmark-stats-cell { border-right: 1px solid var(--bh-fmark-border1); }
        .bh-fmark-stats-cell:nth-child(4n) { border-right: none; }
        .bh-fmark-mega {
          max-width: 1280px;
          margin: 0 auto;
          padding: 56px 40px;
        }
        .bh-fmark-mega-grid {
          display: grid;
          grid-template-columns: var(--bh-fmark-mega-cols);
          gap: 40px;
        }
        .bh-fmark-bottom {
          max-width: 1280px;
          margin: 0 auto;
          padding: 22px 40px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .bh-fmark-bottom-legal {
          flex-wrap: wrap;
          align-items: center;
        }
        .bh-fmark-bottom-links { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }

        /* Tablet — 1024px and below */
        @media (max-width: 1024px) {
          .bh-fmark-mega { padding: 44px 28px; }
          .bh-fmark-mega-grid {
            grid-template-columns: 1fr 1fr;
            gap: 32px 28px;
          }
          .bh-fmark-mega-grid > :first-child { grid-column: 1 / -1; }
          .bh-fmark-mega-grid > :last-child { grid-column: 1 / -1; }
        }

        /* Mobile — 768px and below */
        @media (max-width: 768px) {
          .bh-fmark-hero { padding: 40px 0; }
          .bh-fmark-hero-inner {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 0 20px;
          }
          .bh-fmark-hero-eyebrow { white-space: normal; }
          .bh-fmark-hero-headline { font-size: 30px; }
          .bh-fmark-cta-btn { padding: 14px 18px; font-size: 14px; }
          .bh-fmark-stats-inner { padding: 0 20px; }
          .bh-fmark-mega { padding: 40px 20px; }
          .bh-fmark-mega-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .bh-fmark-bottom {
            padding: 20px 20px 24px;
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
          .bh-fmark-bottom-links { gap: 16px; }
        }

        /* Small mobile — 640px and below: stats become 2x2 */
        @media (max-width: 640px) {
          .bh-fmark-stats-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .bh-fmark-stats-cell:nth-child(4n) { border-right: 1px solid var(--bh-fmark-border1); }
          .bh-fmark-stats-cell:nth-child(2n) { border-right: none; }
          .bh-fmark-stats-cell:nth-child(-n+2) { border-bottom: 1px solid var(--bh-fmark-border1); }
        }
      `}</style>
    <footer
      style={{
        background: theme.bg,
        color: theme.fg1,
        position: "relative",
        overflow: "hidden",
        borderTop: showTopBorder ? `1px solid ${theme.border2}` : undefined,
        // Soft separation strip when sitting under a textured page bg —
        // a subtle inner-shadow line + dim glow softens the seam.
        boxShadow: showTopBorder
          ? `inset 0 1px 0 ${hexToRgba(theme.accent, 0.04)}, 0 -1px 24px ${hexToRgba(theme.accent, 0.05)}`
          : undefined,
      }}
    >
      {/* Hero CTA strip with stadium stripes */}
      <div
        className="bh-fmark-hero"
        style={{
          position: "relative",
          borderBottom: `1px solid ${theme.border1}`,
          backgroundImage: `repeating-linear-gradient(90deg, ${hexToRgba(theme.accent, 0.025)} 0 2px, transparent 2px 60px)`,
        }}
      >
        <div className="bh-fmark-hero-inner">
          <div>
            <div
              className="bh-fmark-hero-eyebrow"
              style={{
                fontFamily: theme.displayFont,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: theme.accent,
                marginBottom: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: theme.accent,
                  boxShadow: `0 0 10px ${hexToRgba(theme.accent, 0.8)}`,
                  flexShrink: 0,
                }}
              />
              {eyebrow}
            </div>
            <h2
              className="bh-fmark-hero-headline"
              style={{
                fontFamily: theme.displayFont,
                fontWeight: 900,
                lineHeight: 1.05,
                textTransform: "uppercase",
                letterSpacing: "-0.005em",
                color: theme.fg1,
                margin: "0 0 16px",
              }}
            >
              {headline.lead}
              <span style={{ color: theme.accent }}>{headline.highlight}</span>
            </h2>
            <p
              style={{
                fontFamily: theme.bodyFont,
                fontSize: 14,
                color: theme.fg2,
                lineHeight: 1.55,
                margin: 0,
                maxWidth: 540,
              }}
            >
              {subheadline}
            </p>
          </div>
          {ctas && ctas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ctas.map((cta, idx) => {
                const primary = cta.variant !== "outline" && idx === 0;
                return (
                  <Link
                    key={`${cta.label}-${cta.href}`}
                    href={cta.href}
                    className="bh-fmark-cta-btn"
                    style={{
                      background: primary ? theme.accent : "transparent",
                      color: primary ? theme.accentFg : theme.fg1,
                      border: primary ? "0" : `1px solid ${theme.border3}`,
                      borderRadius: 10,
                      fontFamily: theme.displayFont,
                      fontWeight: primary ? 800 : 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      textDecoration: "none",
                      boxShadow: primary
                        ? `0 0 32px ${hexToRgba(theme.accent, 0.35)}`
                        : "none",
                    }}
                  >
                    {cta.label}
                    <ArrowUpRight size={18} strokeWidth={2} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ borderBottom: `1px solid ${theme.border1}` }}>
        <div
          className="bh-fmark-stats-inner"
          style={{ ["--bh-fmark-border1" as string]: theme.border1 } as React.CSSProperties}
        >
          {stats.slice(0, 4).map((s, i) => (
            <div key={`${s.label}-${i}`} className="bh-fmark-stats-cell">
              <AnimatedStat
                value={s.value}
                label={s.label}
                delay={i * 120}
                accentColor={s.useAlt ? theme.accent2 : theme.accent}
                altColor={s.useAlt ? theme.accent : theme.accent2}
                fgColor={theme.fg1}
                labelColor={theme.fg3}
                numberFont={theme.displayFont}
                labelFont={theme.monoFont}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mega columns */}
      <div className="bh-fmark-mega">
        <div
          className="bh-fmark-mega-grid"
          style={{ ["--bh-fmark-mega-cols" as string]: megaCols } as React.CSSProperties}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: theme.accentDim,
                  border: `1px solid ${theme.accentBorder}`,
                  boxShadow: `0 0 18px ${hexToRgba(theme.accent, 0.18)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: theme.displayFont,
                  fontWeight: 900,
                  color: theme.accent,
                  fontSize: 18,
                }}
              >
                B
              </div>
              <span
                style={{
                  fontFamily: theme.displayFont,
                  fontWeight: 900,
                  fontSize: 24,
                  textTransform: "uppercase",
                  letterSpacing: "0.005em",
                }}
              >
                <span style={{ color: theme.accent }}>&apos;BALLERS</span>
                <span style={{ color: theme.fg1 }}>HUB</span>
              </span>
            </div>
            <p
              style={{
                fontFamily: theme.bodyFont,
                fontSize: 13,
                color: theme.fg2,
                lineHeight: 1.6,
                margin: "0 0 20px",
                maxWidth: 280,
              }}
            >
              El ecosistema digital del fútbol profesional.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SocialButton
                theme={theme}
                href="https://instagram.com"
                label="Instagram"
                icon={<Instagram size={14} />}
              />
              <SocialButton
                theme={theme}
                href="https://linkedin.com"
                label="LinkedIn"
                icon={<Linkedin size={14} />}
              />
              <SocialButton
                theme={theme}
                href="https://wa.me/"
                label="WhatsApp"
                icon={<WhatsAppGlyph />}
              />
            </div>
          </div>

          {linkColumns.map((col) => (
            <LinkColumn
              key={col.title}
              theme={theme}
              title={col.title}
              links={col.links}
            />
          ))}

          <div style={{ minWidth: 0 }}>
            <NewsletterForm
              accentColor={newsletterColor}
              buttonFg={theme.accentFg}
              fgColor={theme.fg2}
              hintColor={theme.fg3}
              inputBg={theme.bg}
              inputBorder={theme.border2}
              inputColor={theme.fg1}
              displayFont={theme.displayFont}
              bodyFont={theme.bodyFont}
            />
          </div>
        </div>
      </div>

      {/* Full-width divider — line spans the viewport, content stays capped. */}
      <div style={{ borderTop: `1px solid ${theme.border1}` }}>
        <div className="bh-fmark-bottom">
          <div
            className="bh-fmark-bottom-legal"
            style={{
              fontFamily: theme.monoFont,
              fontSize: 11,
              color: theme.fg3,
              display: "flex",
              gap: 8,
            }}
          >
            <span>© {new Date().getFullYear()} BallersHub S.A. · Made in Buenos Aires</span>
            {showCredits && (
              <>
                <span style={{ color: theme.fg4 }}>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  Desarrollado por
                  <a
                    href="https://www.julianberardinelli.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: theme.fg2,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://www.google.com/s2/favicons?domain=julianberardinelli.com&sz=32"
                      alt=""
                      style={{ width: 13, height: 13, borderRadius: 3 }}
                    />
                    Julián Berardinelli
                  </a>
                </span>
              </>
            )}
          </div>
          <div className="bh-fmark-bottom-links">
            {[
              { label: "Términos", href: "/legal/terms" },
              { label: "Privacidad", href: "/legal/privacy" },
              { label: "Cookies", href: "/legal/cookies" },
            ].map((t) => (
              <Link
                key={t.label}
                href={t.href}
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: 12,
                  color: theme.fg3,
                  textDecoration: "none",
                }}
              >
                {t.label}
              </Link>
            ))}
            <div
              title="Próximamente"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${theme.border2}`,
                fontFamily: theme.monoFont,
                fontSize: 11,
                color: theme.fg2,
                opacity: 0.5,
                whiteSpace: "nowrap",
              }}
            >
              <Globe size={12} /> ES <span style={{ color: theme.fg4 }}>/ EN</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
}
