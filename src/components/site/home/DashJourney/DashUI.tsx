"use client";

// BallersHub — DashJourney UI: device mock frames (browser + phone) and the
// screen contents shown across the three steps. Ported from the Claude Design
// prototype; font literals swapped for the design-system CSS variables and
// window.ClubCrest swapped for the shared import.

import * as React from "react";

import { ClubCrest } from "../HeroJourney/tags";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "../HeroJourney/useHeroScroll";

const _BARLOW = FONT_DISPLAY;
const _DM = FONT_BODY;
const _MONO = FONT_MONO;

type CSS = React.CSSProperties;
export type MediaConfig = { avatar?: string; cover?: string; coverVideo?: string; reel?: string; reelPoster?: string };

/* ── browser window chrome ── */
export const BrowserMock = ({
  accent = "#CCFF00",
  url = "ballershub.com/lucas-vega",
  children,
  style,
  glow,
}: {
  accent?: string;
  url?: string;
  children?: React.ReactNode;
  style?: CSS;
  glow?: boolean;
}) => (
  <div style={{ borderRadius: 16, overflow: "hidden", background: "#0c0d10", border: "1px solid rgba(255,255,255,0.12)", boxShadow: `0 40px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.03), ${glow ? `0 0 70px -30px ${accent}` : "0 0 0 transparent"}`, ...style }}>
    <div style={{ height: 38, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ display: "flex", gap: 7 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.85 }} />
        ))}
      </span>
      <div style={{ flex: 1, maxWidth: 360, margin: "0 auto", height: 22, borderRadius: 7, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "0 12px" }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.4"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
        <span style={{ fontFamily: _MONO, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{url}</span>
      </div>
    </div>
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

/* ── phone chrome ── */
export const PhoneMock = ({ children, style, noNotch, screenRatio = "9/19" }: { accent?: string; children?: React.ReactNode; style?: CSS; noNotch?: boolean; screenRatio?: string }) => (
  <div style={{ width: 248, borderRadius: 38, padding: 9, background: "linear-gradient(160deg,#1a1c20,#070708)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 44px 80px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)", ...style }}>
    <div style={{ borderRadius: 30, overflow: "hidden", background: "#0a0b0d", position: "relative", aspectRatio: screenRatio }}>
      {/* The fake Dynamic Island — hidden via noNotch when the screen content (a real
          phone recording) already includes its own status bar + island. */}
      {!noNotch && <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 78, height: 19, borderRadius: 999, background: "#000", zIndex: 5 }} />}
      {children}
    </div>
  </div>
);

export const Avatar = ({ accent, size = 56, init = "LV", ring, src }: { accent?: string; size?: number; init?: string; ring?: boolean; src?: string }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, padding: ring ? 2 : 0, background: ring ? `conic-gradient(${accent},${accent}66,${accent})` : "transparent", boxShadow: ring ? `0 0 18px -4px ${accent}` : "none" }}>
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#2a2f3a,#11141a)", border: "2px solid #0a0b0d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: _BARLOW, fontWeight: 900, fontSize: size * 0.36, color: "#fff" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        init
      )}
    </div>
  </div>
);

/* ── media slot (image/video region inside a mock) ── */
export const MediaSlot = ({
  src,
  video,
  poster,
  alt = "",
  label = "Imagen",
  accent = "#CCFF00",
  radius = 0,
  fit = "cover",
  dim,
  hint,
  style,
}: {
  src?: string;
  video?: string;
  poster?: string;
  alt?: string;
  label?: string;
  accent?: string;
  radius?: number;
  fit?: CSS["objectFit"];
  dim?: string;
  hint?: boolean;
  style?: CSS;
}) => {
  const base: CSS = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, display: "block", borderRadius: radius };
  if (video)
    return (
      <>
        <video src={video} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-label={alt} style={{ ...base, ...style }} />
        {dim && <span style={{ position: "absolute", inset: 0, background: dim, borderRadius: radius, pointerEvents: "none" }} />}
      </>
    );
  if (src)
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" decoding="async" style={{ ...base, ...style }} />
        {dim && <span style={{ position: "absolute", inset: 0, background: dim, borderRadius: radius, pointerEvents: "none" }} />}
      </>
    );
  // Empty: invisible but tagged so it's easy to find & fill (pass hint to reveal).
  if (!hint) return <span data-media-slot={label} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
  return (
    <div data-media-slot={label} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.025)", border: `1px dashed ${accent}55`, borderRadius: radius, ...style }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.6" opacity="0.7"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10.5" r="1.5" /><path d="M21 16l-5-5L5 21" /></svg>
      <span style={{ fontFamily: _DM, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `${accent}cc` }}>{label}</span>
    </div>
  );
};

const Bar = ({ w = "100%", h = 9, c = "rgba(255,255,255,0.1)", r = 4 }: { w?: number | string; h?: number; c?: string; r?: number }) => (
  <span style={{ display: "block", width: w, height: h, borderRadius: r, background: c, flexShrink: 0 }} />
);

/* A real screen-recording filling a mock (replaces the stylised screen). webm
   (AV1) + mp4 (H.264) sources + poster, muted-autoplay loop. `ar` sets the
   browser aspect ("1280/800"); `fill` covers a positioned parent (the phone). */
export const MockVideo = ({ name, ar, fill, radius = 0 }: { name: string; ar?: string; fill?: boolean; radius?: number }) => {
  const b = `/videos/${name}`;
  const style: CSS = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: radius }
    : { display: "block", width: "100%", aspectRatio: ar, objectFit: "cover", background: "#0a0b0d", borderRadius: radius };
  return (
    <video autoPlay muted loop playsInline preload="metadata" poster={`${b}.jpg`} style={style}>
      <source src={`${b}.webm`} type={`video/webm; codecs="av01.0.05M.08"`} />
      <source src={`${b}.mp4`} type={`video/mp4; codecs="avc1.640028"`} />
    </video>
  );
};

/* ── 1 · public profile (browser, step 1) ── */
export const ProfileScreen = ({ accent = "#CCFF00", h = 460, media = {} }: { accent?: string; h?: number; media?: MediaConfig }) => (
  <div style={{ height: h, background: "radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.05), transparent 60%), #0a0b0d", overflow: "hidden" }}>
    <div style={{ height: "38%", position: "relative", background: `linear-gradient(150deg, ${accent}22, transparent 55%), linear-gradient(#15171c,#0a0b0d)`, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <MediaSlot src={media.cover} video={media.coverVideo} accent={accent} label="Portada 16:6" dim="linear-gradient(180deg, rgba(8,8,8,0.05), rgba(8,8,8,0.6))" />
      <div style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: `radial-gradient(circle at 80% 30%, ${accent}33, transparent 40%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 30, bottom: -38, display: "flex", alignItems: "flex-end", gap: 18 }}>
        <Avatar accent={accent} size={92} ring src={media.avatar} />
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 34, color: "#fff", lineHeight: 0.95, textTransform: "uppercase" }}>Lucas Vega <span style={{ fontSize: 22 }}>🇦🇷</span></div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ fontFamily: _BARLOW, fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", color: accent, background: `${accent}1a`, border: `1px solid ${accent}40`, borderRadius: 7, padding: "3px 10px" }}>MCO</span>
            <span style={{ fontFamily: _BARLOW, fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", color: "#22C55E", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, padding: "3px 10px" }}>VERIFICADO</span>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", right: 26, top: 22, display: "flex", gap: 9 }}>
        <span style={{ fontFamily: _DM, fontWeight: 600, fontSize: 13, color: "#080808", background: accent, borderRadius: 9, padding: "8px 16px" }}>Contactar</span>
      </div>
    </div>
    <div style={{ padding: "54px 30px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {([["23", "Partidos"], ["9", "Goles"], ["1.94m", "Altura"]] as const).map(([n, l], i) => (
        <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 28, color: i === 1 ? accent : "#fff", lineHeight: 1 }}>{n}</div>
          <div style={{ fontFamily: _DM, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: "18px 30px", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        <MediaSlot video={media.reel} poster={media.reelPoster} accent={accent} label="Reel 16:9" />
        <span style={{ position: "absolute", left: 12, bottom: 10, display: "flex", alignItems: "center", gap: 7, fontFamily: _DM, fontSize: 11, fontWeight: 600, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="9" height="9" viewBox="0 0 24 24" fill="#080808"><path d="M8 5v14l11-7z" /></svg></span>Reel · 0:38
        </span>
      </div>
      {[1, 2].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 11, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <ClubCrest club={i === 1 ? "CA Temperley" : "FC Weesen"} size={32} accent={accent} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Bar w="55%" h={9} c="rgba(255,255,255,0.2)" /><Bar w="34%" h={7} /></div>
          <Bar w={44} h={20} c={`${accent}cc`} r={6} />
        </div>
      ))}
    </div>
  </div>
);

/* ── mobile profile (phone, step 1) ── */
export const ProfilePhone = ({ accent = "#CCFF00", media = {} }: { accent?: string; media?: MediaConfig }) => (
  <div style={{ position: "absolute", inset: 0, background: "#0a0b0d", display: "flex", flexDirection: "column" }}>
    <div style={{ height: "30%", background: `linear-gradient(160deg, ${accent}2e, transparent 60%), #14161b`, position: "relative" }}>
      <MediaSlot src={media.cover} video={media.coverVideo} accent={accent} label="Portada" dim="linear-gradient(180deg, rgba(8,8,8,0.05), rgba(8,8,8,0.55))" />
      <div style={{ position: "absolute", left: "50%", bottom: -30, transform: "translateX(-50%)", textAlign: "center" }}>
        <Avatar accent={accent} size={62} ring src={media.avatar} />
      </div>
    </div>
    <div style={{ paddingTop: 38, textAlign: "center" }}>
      <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 22, color: "#fff", textTransform: "uppercase", lineHeight: 1 }}>Lucas Vega</div>
      <div style={{ fontFamily: _DM, fontSize: 11, color: accent, marginTop: 4 }}>MCO · Mediocampista</div>
    </div>
    <div style={{ display: "flex", gap: 8, padding: "16px 16px 0" }}>
      {([["23", "PJ"], ["9", "G"], ["4.8", "★"]] as const).map(([n, l], i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 19, color: i === 1 ? accent : "#fff", lineHeight: 1 }}>{n}</div>
          <div style={{ fontFamily: _DM, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: 9, borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}><Bar w="70%" h={7} c="rgba(255,255,255,0.18)" /><Bar w="40%" h={5} /></div>
        </div>
      ))}
    </div>
    <div style={{ margin: 14, padding: "12px 0", textAlign: "center", borderRadius: 12, background: accent, fontFamily: _DM, fontWeight: 700, fontSize: 13, color: "#080808" }}>Contactar a Lucas</div>
  </div>
);

/* ── 2 · profile-edit dashboard (browser, step 2) ── */
export const DashboardScreen = ({ accent = "#CCFF00", previewAccent, h = 520, media = {} }: { accent?: string; previewAccent?: string; h?: number; media?: MediaConfig }) => {
  const pa = previewAccent || accent;
  return (
    <div style={{ height: h, display: "flex", background: "#0a0b0d", overflow: "hidden" }}>
      <div style={{ width: 188, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.015)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, padding: "0 6px" }}>
          <span style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 20, color: "#fff" }}><span style={{ color: accent }}>&apos;</span>BH</span>
          <span style={{ fontFamily: _DM, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Dashboard</span>
        </div>
        {["Mi perfil", "Trayectoria", "Estadísticas", "Multimedia", "Identidad visual", "Reseñas"].map((it, i) => (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9, background: i === 1 ? `${accent}14` : "transparent", border: i === 1 ? `1px solid ${accent}33` : "1px solid transparent" }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: i === 1 ? accent : "rgba(255,255,255,0.25)" }} />
            <span style={{ fontFamily: _DM, fontSize: 13, fontWeight: i === 1 ? 600 : 400, color: i === 1 ? "#fff" : "rgba(255,255,255,0.5)" }}>{it}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: 12, borderRadius: 11, background: `${accent}10`, border: `1px solid ${accent}2a` }}>
          <Bar w="60%" h={8} c={accent} />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}><Bar w="90%" h={6} /><Bar w="70%" h={6} /></div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 50, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: _BARLOW, fontWeight: 800, fontSize: 21, color: "#fff", textTransform: "uppercase" }}>Trayectoria</div>
          <span style={{ fontFamily: _DM, fontSize: 11, color: "rgba(255,255,255,0.36)" }}>Construí tu historia</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
            <Avatar accent={accent} size={30} />
          </div>
        </div>
        <div style={{ flex: 1, padding: 22, display: "grid", gridTemplateColumns: "1fr 0.82fr", gap: 18, overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <Bar w="34%" h={11} c="rgba(255,255,255,0.22)" />
            {["CA Temperley", "CA Independiente", "FC Weesen"].map((club, i) => (
              <div key={club} style={{ display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 12, background: i === 0 ? `${accent}0d` : "rgba(255,255,255,0.025)", border: i === 0 ? `1px solid ${accent}33` : "1px solid rgba(255,255,255,0.05)" }}>
                <ClubCrest club={club} size={34} accent={accent} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Bar w="58%" h={9} c="rgba(255,255,255,0.22)" /><Bar w="40%" h={7} /></div>
                <span style={{ fontFamily: _MONO, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>&apos;1{8 - i}–&apos;{18 - i}</span>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${pa}3a`, background: "#070809", position: "relative", boxShadow: `0 0 50px -28px ${pa}` }}>
            <div style={{ height: 22, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontFamily: _DM, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: pa }}>Vista previa</span>
              <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: pa, boxShadow: `0 0 8px ${pa}` }} />
            </div>
            <div style={{ height: "42%", background: `linear-gradient(150deg, ${pa}33, transparent 60%), #14161b`, position: "relative" }}>
              <MediaSlot src={media.cover} video={media.coverVideo} accent={pa} label="Portada" dim="linear-gradient(180deg, rgba(8,8,8,0.05), rgba(8,8,8,0.5))" />
              <div style={{ position: "absolute", left: 14, bottom: -20 }}><Avatar accent={pa} size={48} ring src={media.avatar} /></div>
            </div>
            <div style={{ padding: "28px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <Bar w="50%" h={11} c="rgba(255,255,255,0.85)" />
              <Bar w="32%" h={7} c={pa} />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>{[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 30, borderRadius: 7, background: "rgba(255,255,255,0.04)", borderBottom: `2px solid ${i === 1 ? pa : "transparent"}` }} />)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── 3 · agent dashboard (browser, step 3) ── */
const AGENT_ROSTER = [
  { n: "Lucas Vega", pos: "MCO", cc: "🇦🇷", club: "CA Temperley", val: "€420K", trend: "+12%", up: true },
  { n: "Bruno Sosa", pos: "DC", cc: "🇺🇾", club: "FC Weesen", val: "€680K", trend: "+8%", up: true },
  { n: "Marco Pérez", pos: "LD", cc: "🇨🇴", club: "Jonica FC", val: "€310K", trend: "-3%", up: false },
  { n: "Téo Almeida", pos: "EXI", cc: "🇧🇷", club: "Abano Calcio", val: "€540K", trend: "+21%", up: true },
];

export const AgentDashScreen = ({ accent = "#00C2FF", h = 520 }: { accent?: string; h?: number }) => (
  <div style={{ height: h, display: "flex", background: "#070809", overflow: "hidden" }}>
    <div style={{ width: 188, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "18px 14px", display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.012)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, padding: "0 6px" }}>
        <span style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 20, color: "#fff" }}><span style={{ color: accent }}>&apos;</span>BH</span>
        <span style={{ fontFamily: _DM, fontSize: 10, color: accent }}>Agente</span>
      </div>
      {["Cartera", "Seguimiento", "Dossiers", "Mercado", "Mensajes"].map((it, i) => (
        <div key={it} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9, background: i === 0 ? `${accent}16` : "transparent", border: i === 0 ? `1px solid ${accent}38` : "1px solid transparent" }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: i === 0 ? accent : "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: _DM, fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "#fff" : "rgba(255,255,255,0.5)" }}>{it}</span>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 50, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily: _BARLOW, fontWeight: 800, fontSize: 21, color: "#fff", textTransform: "uppercase" }}>Mi cartera</div>
        <span style={{ fontFamily: _DM, fontSize: 11, color: accent }}>4 representados</span>
        <div style={{ marginLeft: "auto" }}><Avatar accent={accent} size={30} init="AG" /></div>
      </div>
      <div style={{ display: "flex", gap: 12, padding: "16px 22px 0" }}>
        {([["€1.95M", "Valor cartera", accent], ["+14%", "Tendencia 90d", "#22C55E"], ["28", "Clubes interesados", "#fff"]] as const).map(([n, l, c], i) => (
          <div key={i} style={{ flex: 1, padding: "13px 15px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 26, color: c, lineHeight: 1 }}>{n}</div>
            <div style={{ fontFamily: _DM, fontSize: 11, color: "rgba(255,255,255,0.42)", marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 22px", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 0.9fr 0.9fr", gap: 8, padding: "0 12px 9px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {["Jugador", "Club", "Valor", "Tend."].map((hd) => <span key={hd} style={{ fontFamily: _DM, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.34)" }}>{hd}</span>)}
        </div>
        {AGENT_ROSTER.map((r, i) => (
          <div key={i} className="dj-statrow" style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 0.9fr 0.9fr", gap: 8, alignItems: "center", padding: "11px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Avatar accent={accent} size={32} init={r.n.split(" ").map((w) => w[0]).join("")} ring />
              <div>
                <div style={{ fontFamily: _BARLOW, fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1 }}>{r.n} <span style={{ fontSize: 12 }}>{r.cc}</span></div>
                <div style={{ fontFamily: _DM, fontSize: 10.5, color: accent }}>{r.pos}</div>
              </div>
            </div>
            <span style={{ fontFamily: _DM, fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>{r.club}</span>
            <span style={{ fontFamily: _BARLOW, fontWeight: 800, fontSize: 17, color: "#fff" }}>{r.val}</span>
            <span style={{ fontFamily: _DM, fontWeight: 600, fontSize: 13, color: r.up ? "#22C55E" : "#FB6060" }}>{r.trend}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── public page preview (phone, step 3) ── */
export const PagePreviewPhone = ({ accent = "#00C2FF", media = {} }: { accent?: string; media?: MediaConfig }) => (
  <div style={{ position: "absolute", inset: 0, background: "#0a0b0d", display: "flex", flexDirection: "column" }}>
    <div style={{ height: "34%", background: `linear-gradient(155deg, ${accent}33, transparent 60%), #101319`, position: "relative" }}>
      <MediaSlot src={media.cover} video={media.coverVideo} accent={accent} label="Portada" dim="linear-gradient(180deg, rgba(8,8,8,0.05), rgba(8,8,8,0.55))" />
      <div style={{ position: "absolute", inset: 0, opacity: 0.4, backgroundImage: `radial-gradient(circle at 75% 20%, ${accent}44, transparent 45%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: "50%", bottom: -28, transform: "translateX(-50%)" }}><Avatar accent={accent} size={58} ring init="BS" src={media.avatar} /></div>
    </div>
    <div style={{ paddingTop: 36, textAlign: "center" }}>
      <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 21, color: "#fff", textTransform: "uppercase", lineHeight: 1 }}>Bruno Sosa</div>
      <div style={{ fontFamily: _DM, fontSize: 11, color: accent, marginTop: 4 }}>DC · Delantero · 🇺🇾</div>
      <div style={{ display: "inline-flex", gap: 6, marginTop: 8 }}>
        <span style={{ fontFamily: _DM, fontSize: 9, fontWeight: 700, color: accent, border: `1px solid ${accent}55`, borderRadius: 6, padding: "3px 8px" }}>REP. OFICIAL</span>
      </div>
    </div>
    <div style={{ padding: "14px 16px 0", display: "flex", gap: 7 }}>
      {([["18", "G"], ["680K", "€"], ["22", "a"]] as const).map(([n, l], i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: _BARLOW, fontWeight: 900, fontSize: 18, color: i === 0 ? accent : "#fff", lineHeight: 1 }}>{n}</div>
          <div style={{ fontFamily: _DM, fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{l}</div>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}>
      <div style={{ padding: "11px 0", textAlign: "center", borderRadius: 12, background: accent, fontFamily: _DM, fontWeight: 700, fontSize: 13, color: "#080808" }}>Solicitar dossier</div>
    </div>
  </div>
);
