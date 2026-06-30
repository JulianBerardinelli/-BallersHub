/* eslint-disable @next/next/no-img-element */
// OG card components — ported 1:1 from the Claude Design handoff
// (`og-cards.jsx`). Rendered by `next/og` ImageResponse (Satori), so every
// multi-child node carries an explicit `display:'flex'` and all sizes are px.
//
// Four templates (1200×630): player profile, home, players index, pricing.
// Plus a staff variant that reuses the player frame.

import { C, FONT, OG_SIZE, type Accent } from "./tokens";
import type { OgStrings } from "./strings";

const W = OG_SIZE.width;
const H = OG_SIZE.height;

// ---- shared primitives -----------------------------------------------------

function Frame({
  glow,
  children,
}: {
  glow: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: W,
        height: H,
        display: "flex",
        overflow: "hidden",
        background: C.black,
        color: C.fg1,
        fontFamily: FONT.body,
      }}
    >
      {/* subtle technical grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div style={{ position: "absolute", inset: 0, ...glow }} />
      {children}
    </div>
  );
}

function BrandMark({ wordmark, h = 26 }: { wordmark: string; h?: number }) {
  return <img src={wordmark} alt="'BallersHub" height={h} style={{ height: h }} />;
}

function Url({ path = "", ac }: { path?: string; ac: Accent }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: FONT.mono,
        fontSize: 18,
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: C.fg3,
        whiteSpace: "nowrap",
      }}
    >
      ballershub.co<span style={{ color: ac.c }}>{path}</span>
    </div>
  );
}

function Eyebrow({ ac, children }: { ac: Accent; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: FONT.mono,
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: ac.c,
      }}
    >
      {children}
    </div>
  );
}

// Checkmark drawn as an SVG (NOT the ✓ glyph): with `emoji:'twemoji'` set for
// the country flag, a text ✓ would be misread as an emoji and 404 on the CDN.
const CHECK_SVG =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#080808" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>`,
  ).toString("base64");

function VCheck({ size = 56 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: C.blue,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `${Math.round(size * 0.09)}px solid ${C.black}`,
        boxShadow: "0 0 22px rgba(0,194,255,0.5)",
      }}
    >
      <img src={CHECK_SVG} alt="" width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} />
    </div>
  );
}

function Chip({
  children,
  accent,
  ac,
}: {
  children: React.ReactNode;
  accent?: boolean;
  ac: Accent;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 18px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent ? ac.c : C.border}`,
        fontFamily: FONT.heading,
        fontSize: 19,
        fontWeight: 600,
        letterSpacing: "0.01em",
        color: C.fg1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 01 · PLAYER (and staff variant) — ballershub.co/[slug]
// ============================================================================

export type PlayerCardData = {
  firstName: string;
  lastName: string;
  flag: string; // emoji
  countryName: string;
  eyebrow: string; // "Perfil de jugador" / "Cuerpo técnico"
  slug: string;
  avatarUrl: string;
  verified: boolean;
  /** Ordered short facts → chips. Accent flag toggles lime border. */
  chips: { label: React.ReactNode; accent?: boolean }[];
  club: string | null;
  crestUrl: string | null;
  verifiedTag: string;
};

export function PlayerCard({
  d,
  ac,
  wordmark,
}: {
  d: PlayerCardData;
  ac: Accent;
  wordmark: string;
}) {
  const last = (d.lastName || "").trim();
  const lastSize = last.length > 13 ? 64 : last.length > 10 ? 78 : 92;
  const ghost = last.slice(0, 3) || "BH";
  return (
    <Frame
      glow={{
        background: `radial-gradient(60% 90% at 20% 50%, ${ac.dim}, transparent 60%)`,
      }}
    >
      {/* ghost wordmark of continuity */}
      <div
        style={{
          position: "absolute",
          right: -40,
          bottom: -70,
          display: "flex",
          fontFamily: FONT.display,
          fontWeight: 900,
          fontSize: 300,
          lineHeight: 0.8,
          textTransform: "uppercase",
          letterSpacing: "-0.04em",
          color: "transparent",
          WebkitTextStroke: "1.5px rgba(255,255,255,0.05)",
        }}
      >
        {ghost}
      </div>

      {/* top bar */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandMark wordmark={wordmark} h={26} />
        <Url path={"/" + (d.slug || "")} ac={ac} />
      </div>

      {/* circular avatar */}
      <div style={{ position: "absolute", left: 80, top: 150, width: 360, height: 360, display: "flex" }}>
        <div
          style={{
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            background: ac.c,
            boxShadow: `0 0 70px ${ac.glow}`,
          }}
        />
        <img
          src={d.avatarUrl}
          alt=""
          width={360}
          height={360}
          style={{ width: 360, height: 360, borderRadius: "50%", objectFit: "cover" }}
        />
        {d.verified && (
          <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex" }}>
            <VCheck size={56} />
          </div>
        )}
      </div>

      {/* right block */}
      <div style={{ position: "absolute", left: 500, right: 56, top: 168, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>{d.flag}</span>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 17,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.fg2,
            }}
          >
            {d.countryName}
          </span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: C.fg4 }} />
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 17,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: ac.c,
            }}
          >
            {d.eyebrow}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: FONT.heading,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            color: C.fg2,
            lineHeight: 1,
            marginBottom: 2,
          }}
        >
          {d.firstName}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: FONT.display,
            fontWeight: 900,
            fontSize: lastSize,
            lineHeight: 0.84,
            textTransform: "uppercase",
            letterSpacing: "-0.025em",
          }}
        >
          {last}
        </div>

        {/* fact chips */}
        {d.chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
            {d.chips.map((chip, i) => (
              <Chip key={i} accent={chip.accent} ac={ac}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}

        {/* club */}
        {d.club && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 34 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                overflow: "hidden",
                background: C.surface2,
                border: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT.display,
                fontWeight: 900,
                fontSize: 18,
                color: C.fg2,
              }}
            >
              {d.crestUrl ? (
                <img
                  src={d.crestUrl}
                  alt=""
                  width={46}
                  height={46}
                  style={{ width: 46, height: 46, objectFit: "contain", padding: 4 }}
                />
              ) : (
                clubMonogram(d.club)
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontFamily: FONT.mono,
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  color: C.fg3,
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                Club
              </div>
              <div style={{ display: "flex", fontFamily: FONT.heading, fontWeight: 700, fontSize: 24, color: C.fg1, lineHeight: 1 }}>
                {d.club}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* bottom verified tag */}
      <div
        style={{
          position: "absolute",
          left: 500,
          bottom: 46,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: C.blue, boxShadow: "0 0 12px rgba(0,194,255,0.6)" }} />
        <span style={{ fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: C.fg3 }}>
          {d.verifiedTag}
        </span>
      </div>
    </Frame>
  );
}

function clubMonogram(club: string): string {
  return club
    .replace(/[^A-Za-zÀ-ÿ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ============================================================================
// 02 · HOME — ballershub.co
// ============================================================================

export function HomeCard({
  S,
  ac,
  wordmark,
  isotipo,
}: {
  S: OgStrings;
  ac: Accent;
  wordmark: string;
  isotipo: string;
}) {
  return (
    <Frame
      glow={{ background: `radial-gradient(55% 90% at 86% 46%, ${ac.dim}, transparent 62%)` }}
    >
      <div style={{ position: "absolute", right: 80, top: 165, display: "flex" }}>
        <img
          src={isotipo}
          alt=""
          width={300}
          height={300}
          style={{ width: 300, height: 300, borderRadius: "50%", boxShadow: "0 0 40px rgba(204,255,0,0.4)" }}
        />
      </div>

      <div style={{ position: "absolute", top: 56, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark wordmark={wordmark} h={28} />
        <Url ac={ac} />
      </div>

      <div style={{ position: "absolute", left: 64, top: 168, width: 740, display: "flex", flexDirection: "column" }}>
        <Eyebrow ac={ac}>{S.homeEyebrow}</Eyebrow>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 22,
            fontFamily: FONT.display,
            fontWeight: 900,
            fontSize: 82,
            lineHeight: 0.92,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          <span>{S.homeTitle[0]}</span>
          <span style={{ color: ac.c }}>{S.homeTitle[1]}</span>
          <span>{S.homeTitle[2]}</span>
        </div>
      </div>

      {/* stats */}
      <div style={{ position: "absolute", left: 64, bottom: 54, display: "flex", gap: 56 }}>
        {S.homeStats.map(([n, l], i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: FONT.display, fontWeight: 900, fontSize: 50, lineHeight: 0.9, color: i === 0 ? ac.c : C.fg1 }}>
              {n}
            </div>
            <div style={{ display: "flex", fontFamily: FONT.mono, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", color: C.fg3, marginTop: 6 }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ============================================================================
// 03 · PLAYERS — ballershub.co/players
// ============================================================================

export function PlayersCard({
  S,
  ac,
  wordmark,
  globe,
  avatars,
}: {
  S: OgStrings;
  ac: Accent;
  wordmark: string;
  globe: string;
  avatars: string[];
}) {
  return (
    <Frame
      glow={{ background: `radial-gradient(46% 80% at 84% 50%, ${ac.dim}, transparent 60%)` }}
    >
      <div style={{ position: "absolute", right: 70, top: 115, display: "flex" }}>
        <img src={globe} alt="" width={400} height={400} style={{ width: 400, height: 400 }} />
      </div>

      <div style={{ position: "absolute", top: 56, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark wordmark={wordmark} h={28} />
        <Url path="/players" ac={ac} />
      </div>

      <div style={{ position: "absolute", left: 64, top: 156, display: "flex", flexDirection: "column" }}>
        <Eyebrow ac={ac}>{S.playersEyebrow}</Eyebrow>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 20,
            maxWidth: 700,
            fontFamily: FONT.display,
            fontWeight: 900,
            fontSize: 72,
            lineHeight: 0.92,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          <span>{S.playersTitle[0]}</span>
          <span style={{ color: ac.c }}>{S.playersTitle[1]}</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 600,
            fontFamily: FONT.heading,
            fontWeight: 600,
            fontSize: 22,
            lineHeight: 1.45,
            color: C.fg2,
          }}
        >
          {S.playersSub}
        </div>
      </div>

      {/* avatar cluster */}
      <div style={{ position: "absolute", left: 64, bottom: 54, display: "flex", alignItems: "center" }}>
        {avatars.map((src, i) => (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : -24, display: "flex", padding: 3, borderRadius: "50%", background: C.black }}>
            <img
              src={src}
              alt=""
              width={92}
              height={92}
              style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", boxShadow: `0 0 0 2px ${ac.c}` }}
            />
          </div>
        ))}
        <div
          style={{
            display: "flex",
            marginLeft: 24,
            padding: "12px 22px",
            borderRadius: 999,
            background: ac.c,
            color: C.black,
            fontFamily: FONT.display,
            fontWeight: 900,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.01em",
          }}
        >
          {S.playersCount}
        </div>
      </div>
    </Frame>
  );
}

// ============================================================================
// 04 · PRICING — ballershub.co/pricing
// ============================================================================

function PlanCard({
  ac,
  name,
  desc,
  price,
  sub,
  tag,
  pro,
}: {
  ac: Accent;
  name: string;
  desc: string;
  price: string;
  sub?: string;
  tag?: string;
  pro?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "28px 30px",
        borderRadius: 18,
        position: "relative",
        background: pro ? `linear-gradient(160deg, ${ac.dim}, rgba(255,255,255,0.02))` : "rgba(255,255,255,0.03)",
        border: `1px solid ${pro ? ac.c : C.border}`,
        boxShadow: pro ? `0 0 50px ${ac.glow}` : "none",
      }}
    >
      {tag && (
        <div
          style={{
            position: "absolute",
            top: -14,
            right: 24,
            display: "flex",
            padding: "6px 14px",
            borderRadius: 999,
            background: ac.c,
            color: C.black,
            fontFamily: FONT.mono,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {tag}
        </div>
      )}
      <div style={{ display: "flex", fontFamily: FONT.display, fontWeight: 900, fontSize: 38, textTransform: "uppercase", color: pro ? ac.c : C.fg1, lineHeight: 1 }}>
        {name}
      </div>
      <div style={{ display: "flex", margin: "12px 0 18px", fontFamily: FONT.body, fontSize: 17, lineHeight: 1.45, color: C.fg2, minHeight: 48 }}>
        {desc}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: 44, color: C.fg1, lineHeight: 1 }}>{price}</span>
        {sub && <span style={{ fontFamily: FONT.mono, fontSize: 15, color: C.fg3 }}>{sub}</span>}
      </div>
    </div>
  );
}

export function PricingCard({
  S,
  ac,
  wordmark,
  proPrice,
}: {
  S: OgStrings;
  ac: Accent;
  wordmark: string;
  proPrice: string;
}) {
  return (
    <Frame
      glow={{ background: `radial-gradient(60% 80% at 78% 16%, ${ac.dim}, transparent 62%)` }}
    >
      <div style={{ position: "absolute", top: 56, left: 64, right: 64, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark wordmark={wordmark} h={28} />
        <Url path="/pricing" ac={ac} />
      </div>

      <div style={{ position: "absolute", left: 64, top: 150, right: 64, display: "flex", flexDirection: "column" }}>
        <Eyebrow ac={ac}>{S.pricingEyebrow}</Eyebrow>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: 18,
            fontFamily: FONT.display,
            fontWeight: 900,
            fontSize: 64,
            lineHeight: 0.94,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          {/* NBSP at the inline boundaries: Satori trims a flex item's leading/
              trailing space, which would glue the accent word to its neighbours
              ("queACELERAtu"). The pricing title is single-line, so non-breaking
              spaces are safe here. */}
          <span>{S.pricingTitle[0].replace(/ $/, " ")}</span>
          <span style={{ color: ac.c }}>{S.pricingTitle[1]}</span>
          <span>{S.pricingTitle[2].replace(/^ /, " ")}</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 64, right: 64, bottom: 52, display: "flex", gap: 24, alignItems: "stretch" }}>
        <PlanCard ac={ac} name={S.free} desc={S.freeDesc} price={S.free} sub={S.freePrice} />
        <PlanCard ac={ac} pro tag={S.proTag} name={S.pro} desc={S.proDesc} price={proPrice} sub={S.proPrice} />
      </div>
    </Frame>
  );
}
