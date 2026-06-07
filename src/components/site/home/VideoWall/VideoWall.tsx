"use client";

// ============================================================================
//  BallersHub — VideoWall (scroll-driven)
// ----------------------------------------------------------------------------
//  Ported from a Claude Design (claude.ai/design) prototype into the BallersHub
//  Next.js + TypeScript codebase. A full-bleed scrolljacking "wall" of app
//  screen-recordings (6 desktop 16:10 + 3 mobile 9:19.5) that assembles on
//  scroll in a diagonal cascade, pushes in with a depth-of-field blur, then
//  reveals a centered headline + CTA before receding.
//
//  Changes vs. the raw design export:
//   • TS types, default export (dropped the `window.VideoWall` prototype hook).
//   • Styles live in ./VideoWall.css (imported below) instead of a runtime
//     <style> injection — SSR-friendly, no FOUC. Class names are namespaced.
//   • Fonts use the design-system CSS variables (see VideoWall.css).
//   • Real videos lazy-activate: a tile only downloads/plays its clip once the
//     wall nears the viewport (IntersectionObserver) and pauses when it leaves,
//     so 9 clips never tax the initial page load. Multi-format <source> support
//     (WebM/AV1 → MP4/H.264) for the smallest payload.
//
//  Animation is driven by ONE scroll-progress value (0→1) in
//  useScrollProgress → apply(p). That function is the single source of truth;
//  swap it for GSAP/Framer by calling the same body if ever needed.
// ============================================================================

import * as React from "react";
import "./VideoWall.css";
import { VW_COPY, VW_ROWS, type VideoSpot, type VideoWallCopy } from "./videos";

// ── math helpers (also reused by HeroJourney's grid handoff) ──
export const vwCl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const vwLp = (a: number, b: number, t: number) => a + (b - a) * t;
export const vwEo = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
export const vwEio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

// ── per-frame scroll progress (0→1) over a section's scroll length ──
function useScrollProgress(
  ref: React.RefObject<HTMLElement | null>,
  apply: (p: number) => void,
  deps: React.DependencyList = [],
) {
  React.useEffect(() => {
    let raf = 0;
    let last = -1;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const total = el.offsetHeight - window.innerHeight;
        const p = total > 0 ? vwCl(-el.getBoundingClientRect().top / total, 0, 1) : 0;
        if (Math.abs(p - last) > 0.0004) {
          apply(p);
          last = p;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── placeholder mocks (shown until a real <video> fills the spot) ──
const accentStyle = (accent: string) => ({ ["--ac" as string]: accent } as React.CSSProperties);

const DesktopRec = ({ accent }: { accent: string }) => (
  <div className="rec rec-d" style={accentStyle(accent)}>
    <div className="rec-d-bar">
      <i />
      <i />
      <i />
      <span className="rec-d-url" />
    </div>
    <div className="rec-d-main">
      <div className="rec-d-side">
        <b className="on" />
        <b />
        <b />
        <b />
        <b />
      </div>
      <div className="rec-d-content">
        <div className="rec-d-scroll">
          <div className="rec-d-head">
            <span />
            <span className="sm" />
          </div>
          <div className="rec-d-stats">
            <div />
            <div />
            <div />
          </div>
          <div className="rec-d-chart">
            <b />
            <b />
            <b />
            <b />
            <b />
            <b />
            <b />
          </div>
          <div className="rec-d-rows">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
    <span className="rec-cursor">
      <svg viewBox="0 0 24 24" width="14" height="14">
        <path d="M4 2 L4 20 L9 15 L13 22 L16 21 L12 14 L19 14 Z" fill="#fff" stroke="#000" strokeWidth="1" />
      </svg>
    </span>
  </div>
);

const MobileRec = ({ accent }: { accent: string }) => (
  <div className="rec rec-m" style={accentStyle(accent)}>
    <div className="rec-m-status">
      <span />
      <span className="dots" />
    </div>
    <div className="rec-m-head">
      <i className="logo" />
      <i className="ico" />
    </div>
    <div className="rec-m-scroll">
      <div className="rec-m-feed">
        <div className="rec-m-card">
          <i className="av" />
          <div className="rec-m-ct">
            <span />
            <span className="sm" />
          </div>
          <b className="val" />
        </div>
        <div className="rec-m-chips">
          <u />
          <u />
          <u />
        </div>
        <div className="rec-m-list">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rec-m-row">
              <i />
              <span />
              <b />
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="rec-m-tab">
      <s />
      <s className="on" />
      <s />
      <s />
    </div>
  </div>
);

// ── real <video> for a spot — lazy: only loads/plays once the wall is `live` ──
function VideoMedia({ spot, live }: { spot: VideoSpot; live: boolean }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  // `armed` latches true the first time the wall nears the viewport, so the
  // <source> children mount (and the file starts downloading) only then.
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    if (live) setArmed(true);
  }, [live]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !armed) return;
    el.load(); // pick up the just-mounted <source> children
  }, [armed]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !armed) return;
    if (live) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      el.pause();
    }
  }, [live, armed]);

  return (
    <video
      ref={ref}
      className="vmedia"
      poster={spot.poster || undefined}
      muted
      loop
      playsInline
      preload={armed ? "auto" : "none"}
    >
      {armed
        ? spot.sources?.length
          ? spot.sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)
          : spot.src
            ? <source src={spot.src} />
            : null
        : null}
    </video>
  );
}

const hasVideo = (spot: VideoSpot) => !!(spot.src || spot.sources?.length);

// Exported so HeroJourney can render the same tiles inside its own timeline
// (one continuous scrolljack) instead of mounting a second <VideoWall>.
export const VideoTile = React.forwardRef<HTMLDivElement, { v: VideoSpot; accent: string; live: boolean }>(
  ({ v, accent, live }, ref) => {
    const portrait = v.kind === "mobile";
    const isVideo = hasVideo(v);
    return (
      <div ref={ref} className="vtile" data-kind={v.kind} data-spot={v.id}>
        <div className="vtile-inner">
          {isVideo ? (
            <VideoMedia spot={v} live={live} />
          ) : portrait ? (
            <MobileRec accent={accent} />
          ) : (
            <DesktopRec accent={accent} />
          )}
          {!isVideo && v.id ? (
            <span className="vw-slot" style={{ borderColor: `${accent}55`, color: accent }}>
              {v.id.toUpperCase()}
            </span>
          ) : null}
          <div className="vtile-vig" />
          <div className="vsheen" />
          <div className="vprog">
            <span
              className="vprog-fill"
              style={{ background: accent, animationDelay: `${portrait ? -4 : -1.5}s` }}
            />
          </div>
        </div>
      </div>
    );
  },
);
VideoTile.displayName = "VideoTile";

const ArrowIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

type LineRefs = {
  eye: React.RefObject<HTMLDivElement | null>;
  l1: React.RefObject<HTMLSpanElement | null>;
  l2: React.RefObject<HTMLSpanElement | null>;
  p: React.RefObject<HTMLSpanElement | null>;
  cta: React.RefObject<HTMLButtonElement | null>;
};

// ── centered overlay copy + CTA (also reused by HeroJourney) ──
export const OverlayText = React.forwardRef<
  HTMLDivElement,
  { accent: string; copy: VideoWallCopy; onCta?: () => void; refs: LineRefs; inline?: boolean }
>(({ accent, copy, onCta, refs, inline }, ovRef) => (
  <div ref={ovRef} className="vw-ov" style={inline ? { position: "relative", inset: "auto" } : undefined}>
    <div
      className="vw-eyebrow"
      ref={refs.eye}
      style={{ borderColor: `${accent}55`, background: `${accent}18` }}
    >
      <span className="vw-dot" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <span className="vw-eyebrow-t" style={{ color: accent }}>
        {copy.eyebrow}
      </span>
    </div>
    <h2 className="vw-title">
      <span className="vw-line">
        <span ref={refs.l1}>{copy.line1}</span>
      </span>
      <span className="vw-line">
        <span ref={refs.l2}>
          {copy.line2}
          <em style={{ color: accent }}>{copy.accentWord}</em>
        </span>
      </span>
    </h2>
    <div className="vw-line vw-pwrap">
      <span ref={refs.p} className="vw-p">
        {copy.body}
      </span>
    </div>
    <div className="vw-line vw-ctawrap">
      <button
        ref={refs.cta}
        type="button"
        className="vw-cta"
        onClick={onCta}
        style={{ background: accent, boxShadow: `0 8px 30px ${accent}44` }}
      >
        {copy.cta}
        <ArrowIcon />
      </button>
    </div>
  </div>
));
OverlayText.displayName = "OverlayText";

export type VideoWallProps = {
  /** Brand / accent color. Tints glow, time bar, CTA and eyebrow. */
  accent?: string;
  /** Disable scrolljacking → accessible static stacked layout. */
  reduceMotion?: boolean;
  /** Tile layout (see ./videos.ts). */
  rows?: VideoSpot[][];
  /** Scroll length of the pinned section, in vh. Higher = slower. */
  sectionVh?: number;
  /** Overlay copy (merged with defaults). */
  copy?: Partial<VideoWallCopy>;
  /** Click handler for the "Crear portfolio web" CTA. */
  onCta?: () => void;
  /** Extra class on the root <section>. */
  className?: string;
};

export default function VideoWall({
  accent = "#CCFF00",
  reduceMotion = false,
  rows = VW_ROWS,
  sectionVh = 360,
  copy: copyProp,
  onCta,
  className,
}: VideoWallProps) {
  const copy: VideoWallCopy = { ...VW_COPY, ...(copyProp || {}) };
  const rm = reduceMotion;

  const sectionRef = React.useRef<HTMLElement | null>(null);
  const rootRef = React.useRef<HTMLElement | null>(null);
  const wallRef = React.useRef<HTMLDivElement>(null);
  const dimRef = React.useRef<HTMLDivElement>(null);
  const ovRef = React.useRef<HTMLDivElement>(null);
  const tileRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs: LineRefs = {
    eye: React.useRef<HTMLDivElement>(null),
    l1: React.useRef<HTMLSpanElement>(null),
    l2: React.useRef<HTMLSpanElement>(null),
    p: React.useRef<HTMLSpanElement>(null),
    cta: React.useRef<HTMLButtonElement>(null),
  };

  // Real videos play only while the wall is near the viewport.
  const [live, setLive] = React.useState(false);
  React.useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setLive(true); // no IO support → just play
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setLive(entry.isIntersecting),
      { rootMargin: "300px 0px 300px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const playLive = live && !rm; // honor reduced motion: keep videos on their poster

  // Enable looping decorative animations only after the animation clock has
  // genuinely advanced (~200ms of real frames). Keeps a frozen/offscreen mount
  // from showing mid-animation.
  React.useEffect(() => {
    if (rm) return;
    let raf = 0;
    let acc = 0;
    let last: number | null = null;
    let stop = false;
    const step = (ts: number) => {
      if (stop) return;
      if (last != null) acc += ts - last;
      last = ts;
      if (acc > 200) {
        rootRef.current?.classList.add("vw-ready");
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
    };
  }, [rm]);

  // flatten rows → tiles with coords for stagger
  const flat: { v: VideoSpot; ri: number; ci: number }[] = [];
  rows.forEach((row, ri) => row.forEach((v, ci) => flat.push({ v, ri, ci })));
  const NROWS = rows.length;

  useScrollProgress(
    sectionRef,
    (p) => {
      if (rm) return;
      const assemble = vwCl(p / 0.5, 0, 1); //         0→0.5     tiles fly in
      const tin = vwCl((p - 0.54) / 0.2, 0, 1); //     0.54→0.74 text reveal
      const tout = vwCl((p - 0.9) / 0.08, 0, 1); //    0.9→0.98  text exit
      const exit = vwCl((p - 0.88) / 0.12, 0, 1); //   0.88→1    wall recedes

      // Wall: lift while assembling → push in + DOF blur under text → recede on exit
      if (wallRef.current) {
        const lift = vwLp(30, 0, vwEio(assemble));
        const scl = vwLp(0.92, 1, vwEio(assemble)) * vwLp(1, 1.05, vwEo(tin)) * (1 - exit * 0.06);
        wallRef.current.style.transform = `translate3d(0, ${(lift - exit * 4).toFixed(2)}vh, 0) scale(${scl.toFixed(4)})`;
        wallRef.current.style.opacity = (1 - exit * 0.5).toFixed(3);
        wallRef.current.style.filter = `blur(${(vwEo(tin) * 6).toFixed(2)}px)`;
      }

      // Per-tile staggered entrance — diagonal cascade, bottom rows lead
      flat.forEach((t, i) => {
        const node = tileRefs.current[i];
        if (!node) return;
        const stagger = (NROWS - 1 - t.ri) * 0.12 + t.ci * 0.07;
        const lv = vwEo(vwCl((assemble - stagger) / 0.55, 0, 1));
        node.style.opacity = lv.toFixed(3);
        node.style.transform = `translateY(${((1 - lv) * 84).toFixed(1)}px) scale(${vwLp(0.82, 1, lv).toFixed(3)})`;
        // inner does the 3D tilt so the outer flex sizing stays intact
        const inner = node.firstChild as HTMLElement | null;
        if (inner) inner.style.transform = `perspective(1200px) rotateX(${vwLp(11, 0, lv).toFixed(2)}deg)`;
      });

      // Dim veil under the text
      if (dimRef.current) dimRef.current.style.opacity = (vwCl((p - 0.5) / 0.16, 0, 1) * 0.82).toFixed(3);

      // Overlay text — per-element clipped reveal + scrubbed exit
      if (ovRef.current) {
        ovRef.current.style.opacity = (1 - tout).toFixed(3);
        ovRef.current.style.transform = `translateY(${(-tout * 40).toFixed(1)}px)`;
      }
      const fade = (n: HTMLElement | null, d: number) => {
        if (!n) return;
        const lv = vwEo(vwCl((tin - d) / 0.5, 0, 1));
        n.style.opacity = lv.toFixed(3);
        n.style.transform = `translateY(${((1 - lv) * 18).toFixed(1)}px)`;
      };
      const rise = (n: HTMLElement | null, d: number) => {
        if (!n) return;
        const lv = vwEo(vwCl((tin - d) / 0.5, 0, 1));
        n.style.transform = `translateY(${((1 - lv) * 115).toFixed(1)}%)`;
        n.style.opacity = lv.toFixed(3);
      };
      fade(lineRefs.eye.current, 0);
      rise(lineRefs.l1.current, 0.12);
      rise(lineRefs.l2.current, 0.22);
      rise(lineRefs.p.current, 0.36);
      fade(lineRefs.cta.current, 0.48);
    },
    [rm],
  );

  // NOTE: rows are inlined (not a nested <Rows/> component) on purpose — a
  // nested component would remount the whole wall on every `live` toggle,
  // reloading videos and flashing. As plain elements, React reconciles in place.
  const rowsMarkup = (
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
                live={playLive}
                ref={(el) => {
                  tileRefs.current[idx] = el;
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );

  // Reduced motion → static stacked layout, everything visible.
  if (rm) {
    return (
      <section
        ref={rootRef}
        className={`vw-root${className ? ` ${className}` : ""}`}
        style={{ maxWidth: 1560, margin: "0 auto", padding: "120px 28px 100px" }}
      >
        {rowsMarkup}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 56 }}>
          <OverlayText accent={accent} copy={copy} onCta={onCta} refs={lineRefs} inline />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={(el) => {
        sectionRef.current = el;
        rootRef.current = el;
      }}
      className={`vw-root${className ? ` ${className}` : ""}`}
      style={{ height: `${sectionVh}vh`, position: "relative" }}
    >
      <div className="vw-sticky">
        <div ref={wallRef} className="video-wall-stage">
          {rowsMarkup}
        </div>
        <div ref={dimRef} className="vw-dim" />
        <OverlayText ref={ovRef} accent={accent} copy={copy} onCta={onCta} refs={lineRefs} />
      </div>
    </section>
  );
}
