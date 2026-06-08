"use client";

// BallersHub home — HERO JOURNEY (single seamless scrolljack).
// One pinned timeline that flows, driven by ONE scroll progress (0→1):
//   A. Rest    — contained globe (right) + headline/CTA (left). Floating tags.
//   B. Dive    — globe glides to center, grows, spins into Argentina, magnifies.
//                A particle/light WARP field streams outward.
//   C. Bloom   — lime-lit surface blooms; the video grid cross-fades up out of it.
//   D. Grid    — the wall of player recordings assembles; centered headline + CTA.
//
// The video grid REUSES the VideoWall's internal pieces (VideoTile/OverlayText/
// VW_ROWS) so the hero and the wall are one continuous scrolljack — the wall is
// NOT mounted separately below.

import * as React from "react";
import dynamic from "next/dynamic";

import "./HeroJourney.css";
import {
  OverlayText,
  VideoTile,
  VW_COPY,
  VW_ROWS,
  vwCl,
  vwEo,
  vwEio,
  VideoWall,
  type VideoSpot,
  type VideoWallCopy,
} from "@/components/site/home/VideoWall";
import { MOCK_GLOBE_DATA, type HeroGlobeData } from "./data";
import type { FeaturedPos, GlobeDrive } from "./Globe";
import { Btn, Eyebrow, Headline, PlayerTag } from "./tags";
import {
  ACCENT,
  clamp,
  FONT_BODY,
  FONT_DISPLAY,
  lerp,
  rmp,
  SECONDARY,
  useHeroScroll,
  useIsomorphicLayoutEffect,
} from "./useHeroScroll";
import WarpField from "./WarpField";

// Heavy canvas + d3-geo + world-atlas → lazy (keeps it out of the hero's first
// paint / initial bundle; the hero copy still SSRs for SEO/LCP).
const Globe = dynamic(() => import("./Globe"), { ssr: false });

export type HeroTweaks = {
  accent: string;
  headline: string;
  globeStyle: "glow" | "wireframe";
  spinSpeed: number;
  reduceMotion: boolean;
};
const DEFAULT_TWEAKS: HeroTweaks = { accent: ACCENT, headline: "visibilidad", globeStyle: "glow", spinSpeed: 4.5, reduceMotion: false };

// Globe placement as canvas fractions — keep the sphere + glow inside the frame
// at any aspect ratio (never CSS-clipped). Rest (right) → grown (centered).
const REST = { cx: 0.71, cy: 0.5, r: 0.255 };
const GROWN = { cx: 0.5, cy: 0.5, r: 0.46 };
// On phones the globe drops to a lower-center accent so it never sits behind the
// copy (the desktop right-side split doesn't fit a narrow viewport).
const REST_MOBILE = { cx: 0.5, cy: 0.82, r: 0.3 };
// How many floating tags show at once (the most face-on cities) — plus the hovered one.
const MULTI_TAGS = 3;

export type HeroJourneyProps = { tweaks?: Partial<HeroTweaks>; onCta?: () => void; data?: HeroGlobeData };

export default function HeroJourney({ tweaks, onCta, data }: HeroJourneyProps) {
  const t: HeroTweaks = { ...DEFAULT_TWEAKS, ...tweaks };
  const globeData = data ?? MOCK_GLOBE_DATA;
  if (t.reduceMotion) {
    // Accessible: static hero stacked above the static VideoWall (no scrolljack).
    return (
      <>
        <HeroJourneyStatic tweaks={t} onCta={onCta} data={globeData} />
        <VideoWall reduceMotion onCta={onCta} accent={t.accent} />
      </>
    );
  }
  return <HeroJourneyTimeline tweaks={t} onCta={onCta} data={globeData} />;
}

/* ─────────────────────────── globe + floating tags ──────────────────────── */
function JourneyGlobe({
  tweaks,
  drive,
  redrawRef,
  tagLayerRef,
  showTags = true,
  data,
}: {
  tweaks: HeroTweaks;
  drive: React.RefObject<GlobeDrive | null>;
  redrawRef: React.MutableRefObject<(() => void) | null>;
  tagLayerRef: React.RefObject<HTMLDivElement | null>;
  showTags?: boolean;
  data: HeroGlobeData;
}) {
  const tagRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const placeMap = React.useMemo(() => Object.fromEntries(data.featured.map((f) => [f.city, f.place])), [data]);
  const featuredCities = React.useMemo(() => data.featured.map((f) => f.city), [data]);
  const tagAccent = tweaks.accent === ACCENT ? SECONDARY : tweaks.accent;
  const [hovered, setHovered] = React.useState<string | null>(null);
  const hoveredRef = React.useRef<string | null>(null);
  hoveredRef.current = hovered;

  const onFeatured = React.useCallback(
    (arr: FeaturedPos[]) => {
      // Show the few most face-on tags at once (not just one), plus the hovered pin.
      const front = arr.filter((f) => f.front).sort((a, b) => b.vis - a.vis);
      const shown = new Set(front.slice(0, MULTI_TAGS).map((f) => f.key));
      const hov = hoveredRef.current;
      for (const f of arr) {
        const node = tagRefs.current[f.key];
        if (!node) continue;
        const place = placeMap[f.key];
        const selfShift = place === "tr" ? "translate(6%, -112%) scale(0.82)" : "translate(-104%, 12%) scale(0.82)";
        node.style.transform = `translate(${f.x}px, ${f.y}px) ${selfShift}`;
        const isHov = f.key === hov && f.front;
        const op = isHov ? 1 : f.front && shown.has(f.key) ? clamp((f.vis - 0.28) * 2.4, 0, 1) : 0;
        node.style.opacity = op.toFixed(3);
        node.style.filter = `blur(${((1 - op) * 2.2).toFixed(1)}px)`;
        node.style.zIndex = isHov ? "3" : "1";
      }
    },
    [placeMap],
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Globe
        players={data.players}
        cities={data.cities}
        featuredCities={featuredCities}
        globeStyle={tweaks.globeStyle}
        spinSpeed={tweaks.reduceMotion ? 0 : tweaks.spinSpeed}
        accent={tweaks.accent}
        reduceMotion={tweaks.reduceMotion}
        interactive={false}
        onFeatured={onFeatured}
        hoverPin={hovered}
        onHoverPin={setHovered}
        drive={drive}
        redrawRef={redrawRef}
      />
      {showTags ? (
        <div ref={tagLayerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6, willChange: "opacity" }}>
          {data.featured.map((f) => (
            <div
              key={f.city}
              ref={(n) => { tagRefs.current[f.city] = n; }}
              style={{ position: "absolute", left: 0, top: 0, opacity: 0, transformOrigin: f.place === "tr" ? "0% 100%" : "100% 0%", transition: "opacity 240ms ease", willChange: "transform,opacity" }}
            >
              <PlayerTag player={f.player} accent={tagAccent} compact />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── the timeline ─────────────────────────────── */
function HeroJourneyTimeline({ tweaks, onCta, data }: { tweaks: HeroTweaks; onCta?: () => void; data: HeroGlobeData }) {
  const accent = tweaks.accent;
  const copy: VideoWallCopy = { ...VW_COPY };
  const rows: VideoSpot[][] = VW_ROWS;

  // responsive: phones get a lower-center globe + top-aligned copy
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const rest = isMobile ? REST_MOBILE : REST;

  const sectionRef = React.useRef<HTMLElement>(null);
  // globe drive channel (mutated per-frame, read inside the canvas tick)
  const drive = React.useRef<GlobeDrive | null>({ zoom: 1, lookLon: 62, lookLat: 36, lookAmt: 0, cxFrac: REST.cx, cyFrac: REST.cy, radiusFrac: REST.r, render: true });
  const globeRedraw = React.useRef<(() => void) | null>(null);
  const warpRef = React.useRef(0); // WarpField intensity (0..1)

  // layer refs
  const globeWrapRef = React.useRef<HTMLDivElement>(null);
  const tagLayerRef = React.useRef<HTMLDivElement>(null);
  const counterRef = React.useRef<HTMLDivElement>(null);
  const copyRef = React.useRef<HTMLDivElement>(null);
  const hintRef = React.useRef<HTMLDivElement>(null);
  const flashRef = React.useRef<HTMLDivElement>(null);
  const gridLayerRef = React.useRef<HTMLDivElement>(null);
  const wallRef = React.useRef<HTMLDivElement>(null);
  const dimRef = React.useRef<HTMLDivElement>(null);
  const ovRef = React.useRef<HTMLDivElement>(null);
  const tileRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = {
    eye: React.useRef<HTMLDivElement>(null),
    l1: React.useRef<HTMLSpanElement>(null),
    l2: React.useRef<HTMLSpanElement>(null),
    p: React.useRef<HTMLSpanElement>(null),
    cta: React.useRef<HTMLButtonElement>(null),
  };

  // play the grid videos only once the user has scrolled into the dive/handoff
  const [gridLive, setGridLive] = React.useState(false);
  const gridLiveRef = React.useRef(false);

  // flatten rows for staggered assemble
  const flat: { v: VideoSpot; ri: number; ci: number }[] = [];
  rows.forEach((row, ri) => row.forEach((v, ci) => flat.push({ v, ri, ci })));
  const NROWS = rows.length;

  // kick the grid's looping mock-UI / sheen animations once the clock runs
  React.useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last: number | null = null;
    let stop = false;
    const step = (ts: number) => {
      if (stop) return;
      if (last != null) acc += ts - last;
      last = ts;
      if (acc > 200) {
        gridLayerRef.current?.classList.add("vw-ready");
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, []);

  const applyJourney = (p: number) => {
    const d = drive.current;
    if (!d) return;

    // toggle grid video playback at the threshold (state flip, not per-frame)
    if (p > 0.46 && !gridLiveRef.current) { gridLiveRef.current = true; setGridLive(true); }
    else if (p < 0.41 && gridLiveRef.current) { gridLiveRef.current = false; setGridLive(false); }

    /* ── B. globe glides right→center, grows, and we zoom STRAIGHT IN ── */
    const grow = vwEio(rmp(p, 0.05, 0.34));
    const diveZ = vwEio(rmp(p, 0.12, 0.46));
    const pierce = vwEo(rmp(p, 0.44, 0.6));
    d.cxFrac = lerp(rest.cx, GROWN.cx, grow);
    d.cyFrac = lerp(rest.cy, GROWN.cy, grow);
    d.radiusFrac = lerp(rest.r, GROWN.r, grow);
    // No country steering — the world just TURNS as you scroll (scrubbable) while
    // we zoom straight in. spinLon is negative to keep our leftward rotation.
    d.lookAmt = 0;
    d.spinning = p > 0.004;
    d.spinLon = p * -340; // ~½+ turn to the LEFT across the dive
    d.spinTilt = p * -16; // gentle downward tilt while descending
    d.zoom = lerp(1, 2.5, diveZ) * lerp(1, 4.0, pierce);
    d.render = p < 0.62;
    globeRedraw.current?.();
    if (globeWrapRef.current) globeWrapRef.current.style.opacity = (1 - rmp(p, 0.49, 0.59)).toFixed(3);

    /* ── warp particles + light: ramp in during dive, out before the bloom ── */
    warpRef.current = vwEio(rmp(p, 0.12, 0.33)) * (1 - vwEo(rmp(p, 0.5, 0.6)));

    /* ── floating player tags fade out as the dive starts ── */
    if (tagLayerRef.current) tagLayerRef.current.style.opacity = clamp(1 - grow * 3.5, 0, 1).toFixed(3);

    /* ── A. resting copy + counter slide away ── */
    const copyOut = rmp(p, 0.02, 0.18);
    if (copyRef.current) {
      copyRef.current.style.transform = `translateY(${(-copyOut * 80).toFixed(1)}px)`;
      copyRef.current.style.opacity = (1 - copyOut).toFixed(3);
    }
    if (counterRef.current) {
      const cOut = rmp(p, 0.04, 0.16);
      counterRef.current.style.opacity = (1 - cOut).toFixed(3);
      counterRef.current.style.transform = `translateX(-50%) translateY(${(cOut * 26).toFixed(1)}px)`;
    }
    if (hintRef.current) hintRef.current.style.opacity = (1 - rmp(p, 0.02, 0.1)).toFixed(3);

    /* ── C. lime bloom — a brief flash (the grid emerges THROUGH it) ── */
    if (flashRef.current) {
      const fIn = rmp(p, 0.44, 0.525);
      const fOut = rmp(p, 0.525, 0.66);
      flashRef.current.style.opacity = (Math.pow(fIn, 0.8) * (1 - fOut) * 0.8).toFixed(3);
    }

    /* ── D. video grid starts emerging AS the world fades, assembles through the bloom ── */
    const gridIn = rmp(p, 0.49, 0.61);
    const assemble = rmp(p, 0.52, 0.84);
    if (gridLayerRef.current) {
      gridLayerRef.current.style.opacity = gridIn.toFixed(3);
      gridLayerRef.current.style.pointerEvents = gridIn > 0.55 ? "auto" : "none";
    }
    if (wallRef.current) {
      const lift = lerp(26, 0, vwEio(assemble));
      const scl = lerp(0.94, 1, vwEio(assemble));
      wallRef.current.style.transform = `translate3d(0, ${lift.toFixed(1)}px, 0) scale(${scl.toFixed(4)})`;
    }
    flat.forEach((tile, i) => {
      const node = tileRefs.current[i];
      if (!node) return;
      const stagger = (NROWS - 1 - tile.ri) * 0.12 + tile.ci * 0.07;
      const lv = vwEo(vwCl((assemble - stagger) / 0.55, 0, 1));
      node.style.opacity = lv.toFixed(3);
      node.style.transform = `translateY(${((1 - lv) * 84).toFixed(1)}px) scale(${lerp(0.82, 1, lv).toFixed(3)})`;
      const inner = node.firstChild as HTMLElement | null;
      if (inner) inner.style.transform = `perspective(1200px) rotateX(${lerp(11, 0, lv).toFixed(2)}deg)`;
    });
    if (dimRef.current) dimRef.current.style.opacity = (rmp(p, 0.6, 0.78) * 0.55).toFixed(3);

    /* ── E. centered overlay copy reveals ── */
    const tin = rmp(p, 0.7, 0.9);
    if (ovRef.current) ovRef.current.style.opacity = "1";
    const fade = (n: HTMLElement | null, dl: number) => {
      if (!n) return;
      const lv = vwEo(vwCl((tin - dl) / 0.5, 0, 1));
      n.style.opacity = lv.toFixed(3);
      n.style.transform = `translateY(${((1 - lv) * 18).toFixed(1)}px)`;
    };
    const rise = (n: HTMLElement | null, dl: number) => {
      if (!n) return;
      const lv = vwEo(vwCl((tin - dl) / 0.5, 0, 1));
      n.style.transform = `translateY(${((1 - lv) * 115).toFixed(1)}%)`;
      n.style.opacity = lv.toFixed(3);
    };
    fade(lineRefs.eye.current, 0);
    rise(lineRefs.l1.current, 0.12);
    rise(lineRefs.l2.current, 0.22);
    rise(lineRefs.p.current, 0.36);
    fade(lineRefs.cta.current, 0.48);
  };

  // apply the resting state before first paint (no flash of an unpositioned globe);
  // re-apply when crossing the mobile breakpoint so the globe reflows.
  useIsomorphicLayoutEffect(() => { applyJourney(0); }, [isMobile]);
  useHeroScroll(sectionRef, applyJourney, [isMobile]);

  return (
    <section ref={sectionRef} className="hj" style={{ height: "460vh", position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* GLOBE LAYER */}
        <div ref={globeWrapRef} style={{ position: "absolute", inset: 0, zIndex: 1, willChange: "opacity" }}>
          <JourneyGlobe tweaks={tweaks} drive={drive} redrawRef={globeRedraw} tagLayerRef={tagLayerRef} showTags={!isMobile} data={data} />
        </div>

        {/* WARP FIELD */}
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
          <WarpField accent={accent} intensityRef={warpRef} />
        </div>

        {/* live counter chip (anchored under the globe) */}
        <div ref={counterRef} style={{ position: "absolute", left: `${rest.cx * 100}%`, bottom: "16vh", transform: "translateX(-50%)", zIndex: 4, display: isMobile ? "none" : "flex", alignItems: "center", gap: 9, padding: "9px 17px", borderRadius: 999, background: "rgba(12,12,14,0.66)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap", pointerEvents: "none", willChange: "transform,opacity" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}` }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, color: "#fff", letterSpacing: "0.01em" }}>+70</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>jugadores registrados</span>
        </div>

        {/* HERO COPY (rest) */}
        <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", alignItems: isMobile ? "flex-start" : "center", pointerEvents: "none" }}>
          <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: isMobile ? "11vh clamp(24px, 5vw, 64px) 0" : "0 clamp(28px, 5vw, 64px)" }}>
            <div ref={copyRef} style={{ maxWidth: 520, willChange: "transform,opacity", pointerEvents: "auto" }}>
              <div className="rise" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, border: `1px solid ${accent}40`, background: `${accent}12`, marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }} />
                <Eyebrow color={accent}>Beta abierta</Eyebrow>
              </div>
              <Headline which={tweaks.headline} accent={accent} size="clamp(38px, 6.2vw, 64px)" animate />
              <p className="rise" style={{ fontFamily: FONT_BODY, fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: "24px 0 30px", maxWidth: 440, animationDelay: "520ms" }}>
                Centralizá tu perfil profesional, sumá reseñas verificadas y conectate con clubes que buscan potenciar su plantel. Todo en un solo lugar.
              </p>
              <div className="rise" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 30, animationDelay: "600ms" }}>
                <Btn variant="fill" accent={accent} onClick={onCta}>
                  Crear mi perfil
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Btn>
                <Btn variant="outline">
                  Cómo validamos
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </Btn>
              </div>
              <div className="rise" style={{ display: "flex", flexWrap: "wrap", gap: 26, animationDelay: "680ms" }}>
                {([["+1.2K", "Perfiles validados"], ["86", "Clubes activos"], ["4.8/5", "Referencias"]] as const).map((s, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 30, color: i === 0 ? accent : "#fff", lineHeight: 1 }}>{s[0]}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 3 }}>{s[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* scroll hint */}
        <div ref={hintRef} style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Descendé al mapa</span>
          <span className="scroll-dot" />
        </div>

        {/* LIME BLOOM HANDOFF */}
        <div ref={flashRef} style={{ position: "absolute", inset: 0, zIndex: 7, opacity: 0, pointerEvents: "none", background: `radial-gradient(circle at 50% 50%, #ffffff 0%, ${accent} 16%, ${accent}aa 34%, ${accent}33 54%, transparent 74%)` }} />

        {/* VIDEO GRID (emerges from the light) — reuses VideoWall tiles + overlay */}
        <div ref={gridLayerRef} className="vw-root" style={{ position: "absolute", inset: 0, zIndex: 8, opacity: 0, display: "flex", alignItems: "center", justifyContent: "center", willChange: "opacity" }}>
          <div ref={wallRef} className="video-wall-stage">
            <div className="vw-rows">
              {rows.map((row, ri) => (
                <div key={ri} className="vw-row">
                  {row.map((v, ci) => {
                    const idx = rows.slice(0, ri).reduce((a, r) => a + r.length, 0) + ci;
                    return (
                      <VideoTile
                        key={v.id || ci}
                        v={v}
                        accent={accent}
                        live={gridLive}
                        ref={(el) => { tileRefs.current[idx] = el; }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div ref={dimRef} className="vw-dim" />
          <OverlayText ref={ovRef} accent={accent} copy={copy} onCta={onCta} refs={lineRefs} />
        </div>
      </div>
    </section>
  );
}

/* ── reduced-motion resting hero (static, no scrolljack) ── */
function HeroJourneyStatic({ tweaks, onCta, data }: { tweaks: HeroTweaks; onCta?: () => void; data: HeroGlobeData }) {
  const accent = tweaks.accent;
  const drive = React.useRef<GlobeDrive | null>({ zoom: 1, lookLon: 62, lookLat: 36, lookAmt: 0, cxFrac: 0.5, cyFrac: 0.5, radiusFrac: 0.42, render: true });
  const redraw = React.useRef<(() => void) | null>(null);
  const tagLayer = React.useRef<HTMLDivElement>(null);
  return (
    <section className="hj" style={{ minHeight: "88vh", display: "flex", alignItems: "center", position: "relative" }}>
      <div style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: "60px clamp(28px,5vw,64px)", display: "grid", gridTemplateColumns: "minmax(0,1.04fr) minmax(0,0.96fr)", gap: 48, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, border: `1px solid ${accent}40`, background: `${accent}12`, marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />
            <Eyebrow color={accent}>Beta abierta</Eyebrow>
          </div>
          <Headline which={tweaks.headline} accent={accent} size="clamp(38px, 6.2vw, 64px)" animate={false} />
          <p style={{ fontFamily: FONT_BODY, fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: "24px 0 30px", maxWidth: 440 }}>
            Centralizá tu perfil profesional, sumá reseñas verificadas y conectate con clubes que buscan potenciar su plantel.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Btn variant="fill" accent={accent} onClick={onCta}>Crear mi perfil</Btn>
            <Btn variant="outline">Cómo validamos</Btn>
          </div>
        </div>
        <div style={{ position: "relative", aspectRatio: "1 / 1", width: "100%", maxWidth: 520, justifySelf: "end" }}>
          <JourneyGlobe tweaks={{ ...tweaks, reduceMotion: true }} drive={drive} redrawRef={redraw} tagLayerRef={tagLayer} data={data} />
        </div>
      </div>
    </section>
  );
}
