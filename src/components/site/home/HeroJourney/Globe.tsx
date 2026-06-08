"use client";

// HeroJourney — 3D globe (Canvas 2D + d3-geo orthographic), scroll-driven.
// Ported from the Claude Design prototype. Exposes a `drive` ref the parent
// mutates per-frame (steer + zoom) and a `redrawRef` so the parent can force a
// redraw in the correct order after updating `drive`. No React re-render per frame.

import * as React from "react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import { ISO_NUMERIC_TO_ALPHA2 } from "@/lib/scouting/isoNumeric";

export type GlobeCity = { lat: number; lon: number; name: string; cc: string };

// Build the country features + graticule once (module scope, like ScoutGlobe).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COUNTRIES: any = feature(worldAtlas as any, (worldAtlas as any).objects.countries);
const GRATICULE = geoGraticule10();

export type GlobeDrive = {
  zoom: number;
  lookLon: number;
  lookLat: number;
  lookAmt: number;
  cxFrac: number;
  cyFrac: number;
  radiusFrac: number;
  render?: boolean;
  /** Scroll-driven dive rotation (no country steering) — world turns with scroll. */
  spinning?: boolean;
  spinLon?: number;
  spinTilt?: number;
  /** Rest free-spin multiplier (0..1; default 1). */
  spin?: number;
};
export type FeaturedPos = { key: string; x: number; y: number; front: boolean; vis: number };

type GlobeProps = {
  players: { nationality: string | null }[];
  cities: Record<string, GlobeCity>;
  featuredCities?: string[];
  globeStyle?: "glow" | "wireframe";
  spinSpeed?: number;
  tilt?: number;
  accent?: string;
  reduceMotion?: boolean;
  interactive?: boolean;
  onFeatured?: (arr: FeaturedPos[]) => void;
  /** Currently-hovered pin (city key) — highlighted white. */
  hoverPin?: string | null;
  /** Reports the pin under the cursor (city key) or null. */
  onHoverPin?: (key: string | null) => void;
  drive?: React.RefObject<GlobeDrive | null>;
  redrawRef?: React.MutableRefObject<(() => void) | null>;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isoOf = (f: any): string | null => ISO_NUMERIC_TO_ALPHA2[String(f.id ?? "").padStart(3, "0")] || null;

export default function Globe({
  players,
  cities,
  featuredCities = [],
  globeStyle = "glow",
  spinSpeed = 4.5,
  tilt = -16,
  accent = "#CCFF00",
  reduceMotion = false,
  interactive = true,
  onFeatured,
  hoverPin = null,
  onHoverPin,
  drive,
  redrawRef,
}: GlobeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const featRef = React.useRef(featuredCities);
  const onFeatRef = React.useRef(onFeatured);
  const accentRef = React.useRef(accent);
  const spinRef = React.useRef(spinSpeed);
  const driveRef = React.useRef(drive);
  const hoverPinRef = React.useRef(hoverPin);
  const onHoverPinRef = React.useRef(onHoverPin);
  React.useEffect(() => { driveRef.current = drive; }, [drive]);
  React.useEffect(() => { featRef.current = featuredCities; }, [featuredCities]);
  React.useEffect(() => { onFeatRef.current = onFeatured; }, [onFeatured]);
  React.useEffect(() => { accentRef.current = accent; }, [accent]);
  React.useEffect(() => { spinRef.current = spinSpeed; }, [spinSpeed]);
  React.useEffect(() => { hoverPinRef.current = hoverPin; }, [hoverPin]);
  React.useEffect(() => { onHoverPinRef.current = onHoverPin; }, [onHoverPin]);

  const stateRef = React.useRef({
    // Start centered on the Atlantic (Americas left, Europe/Africa right), then
    // free-spin to the right; the dive overrides this to steer toward Argentina.
    rot: [40, tilt, 0] as [number, number, number],
    autoRot: true,
    dragging: false,
    lastT: 0,
    lastInteraction: 0,
    countryDensity: {} as Record<string, number>,
    diveStart: null as [number, number] | null,
    spinBase: null as [number, number] | null,
    pinHits: [] as { key: string; x: number; y: number }[],
    lastHover: null as string | null,
  });

  // density per country (alpha-2)
  React.useEffect(() => {
    const cd: Record<string, number> = {};
    for (const p of players) if (p.nationality) cd[p.nationality] = (cd[p.nationality] || 0) + 1;
    stateRef.current.countryDensity = cd;
  }, [players]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const sphere = { type: "Sphere" } as const;

    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Rotation: scroll-driven spin during the dive (deterministic, scrubbable),
    // legacy lookAmt steering as a fallback, else free-spin to the left at rest.
    const updateRot = (now: number, dt: number) => {
      const s = stateRef.current;
      const drv = driveRef.current?.current;
      if (drv && drv.spinning && !s.dragging) {
        // Capture the base orientation once, then add a deterministic delta from
        // scroll — the world turns as you scroll down, unwinds as you scroll up.
        s.autoRot = false;
        if (!s.spinBase) s.spinBase = [s.rot[0], s.rot[1]];
        s.rot[0] = s.spinBase[0] + (drv.spinLon || 0);
        s.rot[1] = Math.max(-82, Math.min(82, s.spinBase[1] + (drv.spinTilt || 0)));
      } else if (drv && drv.lookAmt > 0 && !s.dragging) {
        s.autoRot = false;
        if (!s.diveStart) s.diveStart = [s.rot[0], s.rot[1]];
        const e = easeIO(Math.max(0, Math.min(1, drv.lookAmt)));
        const dl = ((drv.lookLon - s.diveStart[0] + 540) % 360) - 180;
        s.rot[0] = s.diveStart[0] + dl * e;
        s.rot[1] = s.diveStart[1] + (drv.lookLat - s.diveStart[1]) * e;
      } else {
        s.diveStart = null;
        s.spinBase = null;
        // free-spin to the LEFT (owner preference); `spin` (0..1) can slow/freeze it.
        const spinMul = drv?.spin != null ? drv.spin : 1;
        if (s.autoRot && !s.dragging && !reduceMotion) s.rot[0] -= (dt / 1000) * spinRef.current * spinMul;
        if (!s.autoRot && !s.dragging && now - s.lastInteraction > 3500) s.autoRot = true;
      }
      while (s.rot[0] > 180) s.rot[0] -= 360;
      while (s.rot[0] < -180) s.rot[0] += 360;
    };

    const draw = (W: number, H: number) => {
      const s = stateRef.current;
      const [ar, ag, ab] = hexToRgb(accentRef.current);
      ctx.clearRect(0, 0, W, H);
      const drv = driveRef.current?.current;
      if (drv && drv.render === false) return; // hidden under the bloom

      const cxFrac = drv?.cxFrac ?? 0.5;
      const cyFrac = drv?.cyFrac ?? 0.5;
      const rFrac = drv?.radiusFrac ?? 0.42;
      const cx = W * cxFrac, cy = H * cyFrac;
      const zoom = drv?.zoom ?? 1;
      const R = Math.min(W, H) * rFrac * zoom;
      const hi = zoom > 1.5; // high-zoom dive: cheap fast-path

      const projection = geoOrthographic().scale(R).translate([cx, cy]).rotate(s.rot).clipAngle(90);
      const path = geoPath(projection, ctx);

      // outer glow (skip during the dive — huge radial gradients are costly)
      if (!hi) {
        const glow = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.28);
        glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.13)`);
        glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
        ctx.fill();
      }

      // sphere fill
      ctx.beginPath();
      path(sphere);
      if (hi) {
        ctx.fillStyle = "#090909";
      } else {
        const sf = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.38, R * 0.1, cx, cy, R);
        sf.addColorStop(0, "#161616");
        sf.addColorStop(0.6, "#0d0d0d");
        sf.addColorStop(1, "#040404");
        ctx.fillStyle = sf;
      }
      ctx.fill();

      // graticule
      if (!hi) {
        ctx.beginPath();
        path(GRATICULE);
        ctx.strokeStyle = globeStyle === "wireframe" ? `rgba(${ar},${ag},${ab},0.16)` : "rgba(255,255,255,0.04)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // continents (heat by player density)
      const maxN = Math.max(5, ...Object.values(s.countryDensity || { x: 0 }), 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const f of COUNTRIES.features as any[]) {
        const iso = isoOf(f);
        const count = iso ? s.countryDensity[iso] || 0 : 0;
        // zoom straight in — render all land at high zoom (not just populated)
        const t = Math.min(1, count / maxN);
        let fill: string;
        let stroke: string;
        if (globeStyle === "wireframe") {
          fill = count > 0 ? `rgba(${ar},${ag},${ab},${0.04 + t * 0.18})` : `rgba(${ar},${ag},${ab},0.02)`;
          stroke = count > 0 ? `rgba(${ar},${ag},${ab},${0.35 + t * 0.6})` : `rgba(${ar},${ag},${ab},0.16)`;
        } else {
          const r = Math.round(ar + (255 - ar) * t);
          const g = Math.round(ag + (255 - ag) * t);
          const b = Math.round(ab + (255 - ab) * t);
          const a = count > 0 ? 0.16 + t * 0.55 : 0.05;
          fill = `rgba(${r},${g},${b},${a})`;
          stroke = count > 0 ? `rgba(${r},${g},${b},${Math.min(0.9, 0.4 + t * 0.5)})` : `rgba(${ar},${ag},${ab},0.16)`;
        }
        ctx.beginPath();
        path(f);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = count > 0 ? 0.9 : 0.5;
        ctx.strokeStyle = stroke;
        ctx.stroke();
        if (count > 0 && globeStyle === "glow" && zoom < 1.8) {
          ctx.save();
          ctx.shadowColor = `rgba(${ar},${ag},${ab},${0.35 + t * 0.4})`;
          ctx.shadowBlur = 12 + t * 16;
          ctx.beginPath();
          path(f);
          ctx.fillStyle = `rgba(${ar},${ag},${ab},${0.05 + t * 0.15})`;
          ctx.fill();
          ctx.restore();
        }
      }

      // rim
      if (!hi) {
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${globeStyle === "wireframe" ? 0.6 : 0.4})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // pins + featured positions
      const feats = featRef.current || [];
      const center: [number, number] = [-s.rot[0], -s.rot[1]];
      const hidePins = zoom > 1.5;
      const out: FeaturedPos[] = [];
      const hits: { key: string; x: number; y: number }[] = [];
      for (const key of feats) {
        const c = cities[key];
        if (!c) continue;
        const dist = geoDistance([c.lon, c.lat], center);
        const front = dist < Math.PI / 2 - 0.02;
        const proj = projection([c.lon, c.lat]);
        const vis = front ? Math.cos(dist) : 0;
        if (proj && front && !hidePins) {
          const [x, y] = proj;
          const isHover = key === hoverPinRef.current;
          ctx.save();
          const haloR = isHover ? 26 : 16;
          const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
          halo.addColorStop(0, isHover ? "rgba(255,255,255,0.7)" : `rgba(${ar},${ag},${ab},0.6)`);
          halo.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(x, y, haloR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.beginPath();
          ctx.arc(x, y, isHover ? 4 : 3, 0, Math.PI * 2);
          ctx.fillStyle = isHover ? "#ffffff" : accentRef.current;
          ctx.shadowColor = isHover ? "#ffffff" : accentRef.current;
          ctx.shadowBlur = isHover ? 14 : 8;
          ctx.fill();
          ctx.shadowBlur = 0;
          hits.push({ key, x, y });
        }
        out.push({ key, x: proj ? proj[0] : 0, y: proj ? proj[1] : 0, front, vis });
      }
      s.pinHits = hits;
      onFeatRef.current?.(out);
    };

    const tick = (now: number) => {
      const s = stateRef.current;
      if (!s.lastT) s.lastT = now;
      const dt = Math.min(60, now - s.lastT);
      s.lastT = now;
      updateRot(now, dt);
      draw(wrap.clientWidth, wrap.clientHeight);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // Parent forces a synchronous redraw AFTER updating `drive` (guarantees order).
    if (redrawRef) redrawRef.current = () => { updateRot(performance.now(), 0); draw(wrap.clientWidth, wrap.clientHeight); };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
      if (redrawRef) redrawRef.current = null;
    };
  }, [globeStyle, reduceMotion, cities, redrawRef]);

  // hover detection — works even when not draggable (hero is interactive=false).
  // A window pointermove hit-tests the cursor against the per-frame pin list.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const onMove = (e: PointerEvent) => {
      if (s.dragging) return;
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      let best: string | null = null;
      let bestD = 22;
      for (const h of s.pinHits) {
        const d = Math.hypot(h.x - mx, h.y - my);
        if (d < bestD) {
          best = h.key;
          bestD = d;
        }
      }
      if (best) {
        // pause the free-spin while a pin is hovered so it stays under the cursor
        s.autoRot = false;
        s.lastInteraction = performance.now();
      }
      if (best !== s.lastHover) {
        s.lastHover = best;
        canvas.style.cursor = best ? "pointer" : "default";
        onHoverPinRef.current?.(best);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // drag to rotate (only when interactive)
  React.useEffect(() => {
    if (!interactive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    let drag0: { x: number; y: number; rot: [number, number, number] } | null = null;
    const onDown = (e: PointerEvent) => {
      drag0 = { x: e.clientX, y: e.clientY, rot: [...s.rot] };
      s.dragging = true;
      s.autoRot = false;
      s.lastInteraction = performance.now();
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (s.dragging && drag0) {
        s.rot = [drag0.rot[0] + (e.clientX - drag0.x) * 0.35, Math.max(-78, Math.min(78, drag0.rot[1] - (e.clientY - drag0.y) * 0.3)), 0];
      }
    };
    const onUp = () => { drag0 = null; s.dragging = false; s.lastInteraction = performance.now(); };
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [interactive]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, cursor: interactive ? "grab" : "default" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
