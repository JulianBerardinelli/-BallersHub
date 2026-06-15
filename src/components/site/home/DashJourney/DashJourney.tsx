"use client";

// BallersHub — DASH JOURNEY (second pinned scrolljack, flows out of the videowall).
// One scroll timeline (0→1) drives three steps joined by LIQUID WAVE transitions:
//   0 entrance → wave floods the stage with the step-1 surface (lime).
//   1 Producto  — PC browser + phone mock of the public profile.
//   ↳ wave → dark surface.
//   2 Dashboard — profile-editing dashboard + floating interactive UI cards.
//   ↳ wave → black/blue surface.
//   3 Agente    — agent roster dashboard + a public page preview.
// Ported from the Claude Design prototype: window.* → imports, fonts → CSS vars,
// CSS via ./DashJourney.css, zero per-frame re-render (ref-driven `apply(p)`).

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Eyebrow } from "../HeroJourney/tags";
import { clamp, FONT_BODY, FONT_DISPLAY, lerp, useHeroScroll, useIsomorphicLayoutEffect } from "../HeroJourney/useHeroScroll";
import {
  AgentDashScreen,
  BrowserMock,
  DashboardScreen,
  type MediaConfig,
  MockVideo,
  PagePreviewPhone,
  PhoneMock,
  ProfileScreen,
} from "./DashUI";
import { BrandColorsCard, StatsCard, TrayectoriaCard } from "./DashCards";
import "./DashJourney.css";

const rmp = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);
const eOut = (t: number) => 1 - Math.pow(1 - t, 3);
const eOut4 = (t: number) => 1 - Math.pow(1 - t, 4);
const eInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const DESIGN_W = 1280;
const DESIGN_H = 720;
const LIME = "#CCFF00";
const BLUE = "#00C2FF";

// Fill with real asset URLs to replace the placeholders inside the mocks.
const MEDIA: { profile: MediaConfig; dashPreview: MediaConfig; page: MediaConfig } = {
  profile: {},
  dashPreview: {},
  page: {},
};

type StepCopy = { eye: string; t1: string; t2: string; p: string; tags: string[]; accent?: string; cta?: boolean };
// next-intl `t` is callable + signature-overloaded; using a loose typing avoids
// duplicating its overload set just to thread the translator through.
type Translator = (key: string) => string;
function buildStepCopy(t: Translator): StepCopy[] {
  return [
    { eye: t("steps.product.eyebrow"), t1: t("steps.product.titleLine1"), t2: t("steps.product.titleLine2"), p: t("steps.product.description"), tags: [t("steps.product.tags.indexedGoogle"), t("steps.product.tags.realResponsive"), t("steps.product.tags.readyInSeconds")], cta: true },
    { eye: t("steps.dashboard.eyebrow"), t1: t("steps.dashboard.titleLine1"), t2: t("steps.dashboard.titleLine2"), p: t("steps.dashboard.description"), tags: [t("steps.dashboard.tags.career"), t("steps.dashboard.tags.stats"), t("steps.dashboard.tags.visualIdentity")] },
    { eye: t("steps.agent.eyebrow"), t1: t("steps.agent.titleLine1"), t2: t("steps.agent.titleLine2"), p: t("steps.agent.description"), tags: [t("steps.agent.tags.licenses"), t("steps.agent.tags.collaborations"), t("steps.agent.tags.publicPage")], accent: BLUE, cta: true },
  ];
}

// Each scene's elements are absolutely placed inside a design box scaled to fit.
type Place = { l: number; t: number; w?: number; s?: number };
type TxtPlace = { x: number; y: number; w: number };
type LayMap = {
  box: [number, number];
  s1pc: Place; s1phone: Place; s1txt: TxtPlace;
  s2pc: Place; s2c1: Place; s2c2: Place; s2c3: Place; s2txt: TxtPlace;
  s3pc: Place; s3phone: Place; s3txt: TxtPlace;
};
const LAY: { d: LayMap; m: LayMap } = {
  d: {
    box: [DESIGN_W, DESIGN_H],
    s1pc: { l: 26, t: 132, w: 640 }, s1phone: { l: 505, t: 200, s: 1 }, s1txt: { x: 812, y: 176, w: 400 },
    s2pc: { l: 726, t: 168, w: 520 }, s2c1: { l: 398, t: 130, s: 0.46 }, s2c2: { l: 400, t: 480, s: 0.46 }, s2c3: { l: 520, t: 306, s: 0.4 }, s2txt: { x: 40, y: 138, w: 340 },
    s3pc: { l: 28, t: 128, w: 640 }, s3phone: { l: 506, t: 198, s: 1 }, s3txt: { x: 804, y: 152, w: 400 },
  },
  m: {
    box: [420, 904],
    s1pc: { l: 14, t: 372, w: 392 }, s1phone: { l: 226, t: 470, s: 0.8 }, s1txt: { x: 28, y: 54, w: 364 },
    s2pc: { l: 18, t: 386, w: 388 }, s2c1: { l: 4, t: 352, s: 0.36 }, s2c2: { l: 60, t: 600, s: 0.36 }, s2c3: { l: 176, t: 640, s: 0.3 }, s2txt: { x: 28, y: 90, w: 364 },
    s3pc: { l: 14, t: 378, w: 392 }, s3phone: { l: 228, t: 492, s: 0.74 }, s3txt: { x: 28, y: 54, w: 364 },
  },
};

type WaveDir = "ola" | "cresta" | "diagonal";
// d-string for a viewBox 0 0 100 100 (preserveAspectRatio=none) wave that rises
// to cover the stage; amplitude eases out as f→1 so it ripples then settles.
function wavePath(f: number, dir: WaveDir) {
  const e = eInOut(clamp(f, 0, 1));
  const A = 11 * (1 - e) * (1 - e) + 1.2;
  const ph = f * 6.5;
  if (dir === "cresta") {
    const y = -18 + e * 134;
    return `M0,${(y + Math.sin(ph) * A).toFixed(2)} C16.7,${(y + A).toFixed(2)} 33.3,${(y - A).toFixed(2)} 50,${(y + Math.sin(ph + 2) * A * 0.5).toFixed(2)} S83.3,${(y + A).toFixed(2)} 100,${(y - Math.sin(ph) * A).toFixed(2)} L100,-22 L0,-22 Z`;
  }
  if (dir === "diagonal") {
    const base = 126 - e * 150, yl = base + 11, yr = base - 11, ym = (yl + yr) / 2;
    return `M0,${yl.toFixed(2)} C25,${(ym - A).toFixed(2)} 75,${(ym + A).toFixed(2)} 100,${yr.toFixed(2)} L100,142 L0,142 Z`;
  }
  const y = 120 - e * 142;
  return `M0,${(y - Math.sin(ph) * A).toFixed(2)} C16.7,${(y - A).toFixed(2)} 33.3,${(y + A).toFixed(2)} 50,${(y + Math.sin(ph + 2) * A * 0.5).toFixed(2)} S83.3,${(y - A).toFixed(2)} 100,${(y + Math.sin(ph) * A).toFixed(2)} L100,142 L0,142 Z`;
}

const WaveLayer = ({ z, fill, crest, mainReg, crestReg }: { z: number; fill: string; crest: string; mainReg: React.Ref<SVGPathElement>; crestReg: React.Ref<SVGPathElement> }) => (
  <svg className="dj-wave" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ zIndex: z }}>
    <path ref={mainReg} d="M0,142 L100,142 L100,143 L0,143 Z" fill={fill} />
    <path ref={crestReg} d="" fill="none" stroke={crest} strokeWidth="0.5" strokeLinecap="round" style={{ filter: "blur(0.3px)" }} />
  </svg>
);

type RegFn = (k: string) => (el: HTMLElement | SVGElement | null) => void;

/* trust row under steps 1 & 3 — a "Datos verificados" pill in the design's
   verified green (#22C55E) + a "¿Cómo validamos?" outline button with a shield
   (mirrors the hero CTA). Styling adapts to the lime (dark) vs dark surface. */
const IconShieldCheck = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const IconShield = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const CtaRow = ({ dark, mob }: { dark?: boolean; mob?: boolean }) => {
  const t = useTranslations("home.dashJourney");
  const VERIFIED = "#22C55E";
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontWeight: 600, fontSize: mob ? 12.5 : 13.5, padding: mob ? "9px 14px" : "10px 16px", borderRadius: 10, whiteSpace: "nowrap" };
  const verified: React.CSSProperties = dark
    ? { ...base, background: "#0a0a0a", color: "#fff", border: "1px solid #0a0a0a", boxShadow: "0 10px 26px -12px rgba(0,0,0,0.6)" }
    : { ...base, background: `${VERIFIED}1f`, color: VERIFIED, border: `1px solid ${VERIFIED}66` };
  const how: React.CSSProperties = dark
    ? { ...base, background: "transparent", color: "#0a0a0a", border: "1px solid rgba(0,0,0,0.28)", cursor: "pointer" }
    : { ...base, background: "rgba(255,255,255,0.04)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <span style={verified}><IconShieldCheck color={VERIFIED} />{t("verifiedData")}</span>
      <Link href="/como-validamos" style={{ ...how, textDecoration: "none" }}>{t("howWeValidate")}<IconShield color={dark ? "#0a0a0a" : "#fff"} /></Link>
    </div>
  );
};

/* text block (eyebrow + 2-line title + paragraph + tag chips) */
const Txt = ({ reg, idp, copy, accent, x, y = 188, narrow, dark, w, mob }: { reg: RegFn; idp: string; copy: StepCopy; accent: string; x: number; y?: number; narrow?: boolean; dark?: boolean; w?: number; mob?: boolean }) => {
  const width = w || (narrow ? 340 : 400);
  const tSize = mob ? (narrow ? 31 : 35) : narrow ? 50 : 60;
  const pSize = mob ? 13.5 : narrow ? 14.5 : 16;
  const pMax = Math.min(width, mob ? 360 : narrow ? 360 : 372);
  const ink = dark ? "#0a0a0a" : "#fff";
  const sub = dark ? "rgba(0,0,0,0.66)" : "rgba(255,255,255,0.62)";
  const chip: React.CSSProperties = dark
    ? { color: "#0a0a0a", border: "1px solid rgba(0,0,0,0.22)", background: "rgba(0,0,0,0.05)" }
    : { color: "rgba(255,255,255,0.78)", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" };
  return (
    <div style={{ position: "absolute", left: x, top: y, width, zIndex: 8 }}>
      <div style={{ overflow: "hidden", marginBottom: 18 }}>
        <div ref={reg(idp + "eye")} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "6px 14px", borderRadius: 999, border: `1px solid ${dark ? "rgba(0,0,0,0.28)" : accent + "44"}`, background: dark ? "rgba(0,0,0,0.07)" : `${accent}12` }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: dark ? "#0a0a0a" : accent, boxShadow: dark ? "none" : `0 0 8px ${accent}` }} />
          <Eyebrow color={dark ? "#0a0a0a" : accent}>{copy.eye}</Eyebrow>
        </div>
      </div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: tSize, lineHeight: 0.92, textTransform: "uppercase", letterSpacing: "-0.01em", color: ink, margin: 0 }}>
        <span style={{ display: "block", overflow: "hidden" }}><span ref={reg(idp + "t1")} style={{ display: "block" }}>{copy.t1}</span></span>
        <span style={{ display: "block", overflow: "hidden" }}><span ref={reg(idp + "t2")} style={{ display: "block", color: dark ? "#0a0a0a" : accent }}>{copy.t2}</span></span>
      </h2>
      <p ref={reg(idp + "p")} style={{ fontFamily: FONT_BODY, fontSize: pSize, color: sub, lineHeight: 1.6, margin: mob ? "16px 0 18px" : "20px 0 22px", maxWidth: pMax, fontWeight: dark ? 500 : 400 }}>{copy.p}</p>
      <div ref={reg(idp + "tags")} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: mob ? 14 : 18 }}>
        {/* chips hidden on mobile — they ate vertical space and pushed the CTA
            onto the mocks; the copy already carries the same points */}
        {!mob && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {copy.tags.map((tg) => (
              <span key={tg} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "7px 13px", borderRadius: 9, whiteSpace: "nowrap", ...chip }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: dark ? "#0a0a0a" : accent }} />{tg}
              </span>
            ))}
          </div>
        )}
        {copy.cta && <CtaRow dark={dark} mob={mob} />}
      </div>
    </div>
  );
};

/* reduced-motion fallback — three plain stacked sections */
const DashJourneyStatic = ({ accent }: { accent: string }) => {
  const t = useTranslations("home.dashJourney");
  const stepCopy = buildStepCopy(t);
  return (
    <section style={{ position: "relative", padding: "90px 0" }}>
      {stepCopy.map((s, i) => {
        const ac = s.accent || accent;
        return (
          <div key={i} style={{ maxWidth: 1180, margin: "0 auto 80px", padding: "0 28px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              {i === 0 && <BrowserMock accent={ac} glow><ProfileScreen accent={ac} h={420} /></BrowserMock>}
              {i === 1 && <BrowserMock accent={ac} url="ballershub.com/dashboard" glow><DashboardScreen accent={ac} h={460} /></BrowserMock>}
              {i === 2 && <BrowserMock accent={ac} url="ballershub.com/agente" glow><AgentDashScreen accent={ac} h={460} /></BrowserMock>}
            </div>
            <div>
              <Eyebrow color={ac}>{s.eye}</Eyebrow>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 52, lineHeight: 0.96, textTransform: "uppercase", margin: "14px 0 18px", color: "#fff" }}>{s.t1}<br />{s.t2}</h2>
              <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, maxWidth: 440 }}>{s.p}</p>
              {s.cta && <div style={{ marginTop: 20 }}><CtaRow /></div>}
            </div>
          </div>
        );
      })}
    </section>
  );
};

export type DashTweaks = { accent?: string; liquidStyle?: "Ola" | "Cresta" | "Diagonal"; step1Bg?: "Lime" | "Oscuro"; uiDensity?: "Mínima" | "Media" | "Completa"; reduceMotion?: boolean };

export default function DashJourney({ tweaks, onSkip }: { tweaks: DashTweaks; onSkip?: () => void }) {
  if (tweaks.reduceMotion) return <DashJourneyStatic accent={tweaks.accent || LIME} />;
  return <DashJourneyTimeline tweaks={tweaks} onSkip={onSkip} />;
}

function DashJourneyTimeline({ tweaks, onSkip }: { tweaks: DashTweaks; onSkip?: () => void }) {
  const t = useTranslations("home.dashJourney");
  const dir: WaveDir = ({ Cresta: "cresta", Diagonal: "diagonal", Ola: "ola" } as const)[tweaks.liquidStyle || "Ola"] || "ola";
  const limeStep1 = (tweaks.step1Bg || "Lime") !== "Oscuro";
  const density = tweaks.uiDensity || "Completa";
  const nCards = density === "Mínima" ? 1 : density === "Media" ? 2 : 3;

  const detectMobile = () => typeof window !== "undefined" && window.innerWidth < 760;
  const [isMobile, setMobile] = React.useState(false);
  const L = isMobile ? LAY.m : LAY.d;
  const [DW0, DH0] = L.box;
  const nCardsEff = isMobile ? Math.min(nCards, 2) : nCards;
  const boxRef = React.useRef(L.box);
  boxRef.current = L.box;

  const secRef = React.useRef<HTMLElement>(null);
  const fitRef = React.useRef<HTMLDivElement>(null);
  const N = React.useRef<Record<string, HTMLElement | SVGElement | null>>({});
  const pRef = React.useRef(0);
  const dotRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const guideRef = React.useRef<HTMLDivElement>(null);

  const set = (k: string, transform?: string | null, opacity?: number | string | null) => {
    const n = N.current[k];
    if (!n) return;
    if (transform != null) n.style.transform = transform;
    if (opacity != null) n.style.opacity = (+opacity).toFixed(3);
  };
  const reg: RegFn = (k) => (el) => { N.current[k] = el; };

  const fit = () => {
    const [W, H] = boxRef.current;
    const mob = detectMobile();
    const s = Math.min((window.innerWidth * (mob ? 0.98 : 0.96)) / W, (window.innerHeight * (mob ? 0.95 : 0.92)) / H);
    if (fitRef.current) fitRef.current.style.transform = `translate(-50%,-50%) scale(${s})`;
  };

  const setWave = (mainKey: string, crestKey: string, f: number) => {
    const d = wavePath(f, dir);
    const m = N.current[mainKey], c = N.current[crestKey];
    if (m) m.setAttribute("d", f <= 0.0008 ? "M0,142 L100,142 L100,143 L0,143 Z" : d);
    if (c) c.setAttribute("d", f <= 0.0008 || f >= 0.999 ? "" : d.split(" L100,")[0].replace(/^M/, "M"));
  };

  const lineRise = (k: string, a: number, d: number) => { const lv = eOut(clamp((a - d) / (1 - d), 0, 1)); set(k, `translateY(${((1 - lv) * 112).toFixed(1)}%)`, 1); };
  const fadeRise = (k: string, a: number, d: number) => { const lv = eOut(clamp((a - d) / (1 - d), 0, 1)); set(k, `translateY(${((1 - lv) * 22).toFixed(1)}px)`, lv); };
  const cardIn = (k: string, a: number, d: number, dx: number, dy: number, rot: number, bs = 1) => {
    const lv = eOut4(clamp((a - d) / (1 - d), 0, 1));
    set(k, `translate(${(dx * (1 - lv)).toFixed(1)}px, ${(dy * (1 - lv)).toFixed(1)}px) rotate(${(rot * (1 - lv)).toFixed(2)}deg) scale(${(bs * lerp(0.86, 1, lv)).toFixed(3)})`, clamp(lv * 1.5, 0, 1));
  };

  const apply = (p: number) => {
    pRef.current = p;
    setWave("wA", "wAc", eOut(rmp(p, 0.0, 0.07)));
    setWave("wB", "wBc", eInOut(rmp(p, 0.27, 0.38)));
    setWave("wC", "wCc", eInOut(rmp(p, 0.58, 0.69)));

    /* scene 1 */
    const a1 = eOut(rmp(p, 0.02, 0.11)), o1 = rmp(p, 0.25, 0.31);
    set("s1", `translateY(${((1 - a1) * 56 - o1 * 70).toFixed(1)}px) scale(${(lerp(0.93, 1, a1) - o1 * 0.06).toFixed(3)})`, a1 * (1 - o1));
    set("s1pc", `perspective(1700px) rotateY(${lerp(-24, 0, a1).toFixed(2)}deg) rotateX(${lerp(7, 0, a1).toFixed(2)}deg)`);
    set("s1phone", `perspective(1400px) rotateY(${lerp(34, 8, a1).toFixed(2)}deg) translateY(${lerp(48, 0, eOut(a1)).toFixed(1)}px) scale(${L.s1phone.s})`);
    lineRise("s1eye", a1, 0.0); lineRise("s1t1", a1, 0.08); lineRise("s1t2", a1, 0.16);
    fadeRise("s1p", a1, 0.3); fadeRise("s1tags", a1, 0.42);

    /* scene 2 */
    const a2 = eOut(rmp(p, 0.34, 0.45)), o2 = rmp(p, 0.56, 0.61);
    set("s2", `translateY(${((1 - a2) * 48 - o2 * 60).toFixed(1)}px)`, a2 * (1 - o2));
    set("s2pc", `perspective(1800px) rotateY(${lerp(18, -4, a2).toFixed(2)}deg) scale(${lerp(0.91, 1, a2).toFixed(3)})`);
    cardIn("s2c1", a2, 0.0, -150, -36, -7, L.s2c1.s);
    cardIn("s2c2", a2, 0.18, -110, 110, 6, L.s2c2.s);
    cardIn("s2c3", a2, 0.32, 160, 36, 6, L.s2c3.s);
    lineRise("s2eye", a2, 0.0); lineRise("s2t1", a2, 0.1); lineRise("s2t2", a2, 0.18);
    fadeRise("s2p", a2, 0.32); fadeRise("s2tags", a2, 0.44);

    /* scene 3 */
    const a3 = eOut(rmp(p, 0.66, 0.77)), o3 = rmp(p, 0.97, 1.02);
    set("s3", `translateY(${((1 - a3) * 54).toFixed(1)}px) scale(${lerp(0.94, 1, a3).toFixed(3)})`, a3 * (1 - o3));
    set("s3pc", `perspective(1800px) rotateY(${lerp(-20, -3, a3).toFixed(2)}deg) rotateX(${lerp(6, 0, a3).toFixed(2)}deg)`);
    set("s3phone", `perspective(1400px) rotateY(${lerp(30, 10, a3).toFixed(2)}deg) translateY(${lerp(56, 0, eOut(a3)).toFixed(1)}px) scale(${((L.s3phone.s || 1) * lerp(0.91, 1, a3)).toFixed(3)})`);
    lineRise("s3eye", a3, 0.0); lineRise("s3t1", a3, 0.1); lineRise("s3t2", a3, 0.18);
    fadeRise("s3p", a3, 0.32); fadeRise("s3tags", a3, 0.44);

    /* step guide */
    const step = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;
    const onLime = limeStep1 && step === 0;
    const gAccent = onLime ? "#0a0a0a" : step === 2 ? BLUE : LIME;
    if (guideRef.current) guideRef.current.classList.toggle("onlime", onLime);
    dotRefs.current.forEach((d, i) => {
      if (!d) return;
      const on = i === step;
      d.style.background = on ? gAccent : onLime ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.18)";
      d.style.transform = `scale(${on ? 1 : 0.62})`;
      d.style.boxShadow = on && !onLime ? `0 0 12px ${gAccent}` : "none";
      const lab = d.nextSibling as HTMLElement | null;
      if (lab) lab.style.color = onLime ? "#0a0a0a" : on ? "#fff" : "rgba(255,255,255,0.4)";
    });
    if (guideRef.current) {
      guideRef.current.style.setProperty("--gac", gAccent);
      guideRef.current.classList.toggle("dj-hidden", p < 0.05);
      const fillEl = guideRef.current.querySelector<HTMLElement>(".dj-guide-fill");
      if (fillEl) fillEl.style.height = (clamp(p, 0, 1) * 100).toFixed(1) + "%";
    }
    if (fitRef.current) fitRef.current.style.pointerEvents = p < 0.05 ? "none" : "auto";
    set("decor", null, clamp((p - 0.02) / 0.06, 0, 1));
  };

  React.useEffect(() => {
    const onR = () => { setMobile(detectMobile()); fit(); };
    setMobile(detectMobile());
    fit();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useIsomorphicLayoutEffect(() => { fit(); apply(pRef.current); }, [isMobile]);
  useIsomorphicLayoutEffect(() => { apply(0); fit(); }, []);
  useHeroScroll(secRef, apply, [tweaks.accent, dir, limeStep1, density, isMobile]);

  const skip = () => {
    const el = document.getElementById("planes");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 20, behavior: "smooth" });
    onSkip?.();
  };

  const C = buildStepCopy(t);
  const surf1 = limeStep1 ? LIME : "#0b0c0e";
  const crest1 = limeStep1 ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.16)";

  return (
    // marginTop is applied by the wrapper to overlap the videowall's tail; the
    // stage is transparent so the videowall shows through while the wave floods.
    <section ref={secRef} style={{ height: "520vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", background: "transparent" }}>
        {/* liquid wave surfaces (stacked: each rises over the previous) */}
        <WaveLayer z={1} fill={surf1} crest={crest1} mainReg={reg("wA")} crestReg={reg("wAc")} />
        <WaveLayer z={2} fill="#0a0b0d" crest="rgba(255,255,255,0.16)" mainReg={reg("wB")} crestReg={reg("wBc")} />
        <WaveLayer z={3} fill="#04060d" crest="rgba(0,194,255,0.3)" mainReg={reg("wC")} crestReg={reg("wCc")} />

        {/* ambient light + pattern (fades in with the wave) */}
        <div ref={reg("decor")} style={{ position: "absolute", inset: 0, zIndex: 4, opacity: 0, pointerEvents: "none" }}>
          <div className="dj-orb" style={{ width: 760, height: 760, top: "-22%", left: "-12%", background: `radial-gradient(circle, ${LIME}16, transparent 68%)` }} />
          <div className="dj-orb" style={{ width: 620, height: 620, bottom: "-20%", right: "-8%", background: `radial-gradient(circle, ${BLUE}18, transparent 70%)` }} />
          <div className="dj-bg-grid" />
        </div>

        {/* fitted design stage */}
        <div ref={fitRef} className="dj-fit" style={{ position: "absolute", left: "50%", top: "50%", width: DW0, height: DH0, transformOrigin: "center", zIndex: 6, willChange: "transform" }}>
          {/* SCENE 1 · PRODUCTO */}
          <div ref={reg("s1")} className="dj-scene" style={{ opacity: 0 }}>
            <div ref={reg("s1pc")} className="dj-float" style={{ position: "absolute", left: L.s1pc.l, top: L.s1pc.t, width: L.s1pc.w }}>
              <div className="dj-idle dj-idle-a"><BrowserMock accent={LIME} glow={!limeStep1}><MockVideo name="desktop-1" ar="1280/800" /></BrowserMock></div>
            </div>
            <div ref={reg("s1phone")} className="dj-float" style={{ position: "absolute", left: L.s1phone.l, top: L.s1phone.t, transformOrigin: isMobile ? "top left" : "center" }}>
              <div className="dj-idle dj-idle-b"><PhoneMock accent={LIME} noNotch screenRatio="600/1304"><MockVideo name="profile-mobile" fill /></PhoneMock></div>
            </div>
            <Txt reg={reg} idp="s1" copy={C[0]} accent={limeStep1 ? "#0a0a0a" : LIME} x={L.s1txt.x} y={L.s1txt.y} w={L.s1txt.w} dark={limeStep1} mob={isMobile} />
          </div>

          {/* SCENE 2 · DASHBOARD */}
          <div ref={reg("s2")} className="dj-scene" style={{ opacity: 0 }}>
            <div ref={reg("s2pc")} className="dj-float" style={{ position: "absolute", left: L.s2pc.l, top: L.s2pc.t, width: L.s2pc.w, zIndex: 2 }}>
              <div className="dj-idle dj-idle-a"><BrowserMock accent={LIME} url="ballershub.com/dashboard" glow><MockVideo name="dashboard" ar="1280/720" /></BrowserMock></div>
            </div>
            {nCardsEff >= 3 && (
              <div ref={reg("s2c2")} className="dj-float dj-card-wrap" style={{ position: "absolute", left: L.s2c2.l, top: L.s2c2.t, transform: `scale(${L.s2c2.s})`, transformOrigin: "top left", zIndex: 4 }}>
                <div className="dj-idle dj-idle-b"><TrayectoriaCard accent={LIME} /></div>
              </div>
            )}
            {nCardsEff >= 2 && (
              <div ref={reg("s2c3")} className="dj-float dj-card-wrap" style={{ position: "absolute", left: L.s2c3.l, top: L.s2c3.t, transform: `scale(${L.s2c3.s})`, transformOrigin: "top left", zIndex: 5 }}>
                <div className="dj-idle dj-idle-d"><StatsCard accent={LIME} secondary={BLUE} /></div>
              </div>
            )}
            {nCardsEff >= 1 && (
              <div ref={reg("s2c1")} className="dj-float dj-card-wrap" style={{ position: "absolute", left: L.s2c1.l, top: L.s2c1.t, transform: `scale(${L.s2c1.s})`, transformOrigin: "top left", zIndex: 6 }}>
                <div className="dj-idle dj-idle-c"><BrandColorsCard accent={LIME} /></div>
              </div>
            )}
            <Txt reg={reg} idp="s2" copy={C[1]} accent={LIME} x={L.s2txt.x} y={L.s2txt.y} w={L.s2txt.w} narrow mob={isMobile} />
          </div>

          {/* SCENE 3 · AGENTE */}
          <div ref={reg("s3")} className="dj-scene" style={{ opacity: 0 }}>
            <div ref={reg("s3pc")} className="dj-float" style={{ position: "absolute", left: L.s3pc.l, top: L.s3pc.t, width: L.s3pc.w, zIndex: 2 }}>
              <div className="dj-idle dj-idle-a"><BrowserMock accent={BLUE} url="ballershub.com/agente" glow><AgentDashScreen accent={BLUE} h={440} /></BrowserMock></div>
            </div>
            <div ref={reg("s3phone")} className="dj-float" style={{ position: "absolute", left: L.s3phone.l, top: L.s3phone.t, transformOrigin: isMobile ? "top left" : "center", zIndex: 3 }}>
              <div className="dj-idle dj-idle-b"><PhoneMock accent={BLUE}><PagePreviewPhone accent={BLUE} media={MEDIA.page} /></PhoneMock></div>
            </div>
            <Txt reg={reg} idp="s3" copy={C[2]} accent={BLUE} x={L.s3txt.x} y={L.s3txt.y} w={L.s3txt.w} mob={isMobile} />
          </div>
        </div>

        {/* STEP GUIDE + SKIP (disguised, right edge) */}
        <div ref={guideRef} className="dj-guide" style={{ "--gac": LIME } as React.CSSProperties}>
          <div className="dj-guide-track"><div className="dj-guide-fill" /></div>
          <div className="dj-guide-dots">
            {[t("guide.product"), t("guide.dashboard"), t("guide.agent")].map((lab, i) => (
              <div key={i} className="dj-guide-item">
                <span ref={(el) => { dotRefs.current[i] = el; }} className="dj-guide-dot" />
                <span className="dj-guide-lab">{lab}</span>
              </div>
            ))}
          </div>
          <button type="button" className="dj-skip" onClick={skip}>
            {t("skip")}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
