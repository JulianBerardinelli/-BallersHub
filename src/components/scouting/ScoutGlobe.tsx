"use client";

// BallersHub /players (Scouting) — decorative globe (Phase 1).
//
// Ported from `globe.jsx`, reduced to the decorative scope the data supports
// today: a rotating black sphere with lime-glow continents, tinted by REAL
// nationality density (ISO-2 from each player), draggable, and click-a-country
// to toggle that nationality filter. The Phase-2 layer — city pins, fly-to,
// hover card, globe↔table sync — is intentionally omitted because the app has
// no team→city geo yet (see DISEÑO.md / INTEGRACION.md).
//
// Canvas 2D + d3-geo orthographic projection. world-atlas + d3 are bundled
// (no CDN). The component is dynamically imported with `ssr: false` by the
// hero, so its ~100KB chunk never touches the server HTML or the SEO path.

import { useEffect, useRef } from "react";
import {
  geoContains,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import { isoNumericToAlpha2 } from "@/lib/scouting/isoNumeric";

// Build the static geometry once (module scope) — it never changes.
type AtlasTopology = Parameters<typeof feature>[0];
const TOPO = worldAtlas as unknown as AtlasTopology;
const COUNTRIES = feature(
  TOPO,
  TOPO.objects.countries,
) as unknown as FeatureCollection;
const GRATICULE = geoGraticule10();

type RotState = {
  rot: [number, number, number];
  autoRot: boolean;
  dragging: boolean;
  lastT: number;
  lastInteraction: number;
};

export default function ScoutGlobe({
  countryDensity,
  onCountryClick,
  onReady,
  reduceMotion = false,
}: {
  /** ISO-2 → player count, for the heat tint. */
  countryDensity: Record<string, number>;
  onCountryClick?: (iso2: string) => void;
  onReady?: () => void;
  reduceMotion?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const densityRef = useRef(countryDensity);
  densityRef.current = countryDensity;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const onCountryClickRef = useRef(onCountryClick);
  onCountryClickRef.current = onCountryClick;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const stateRef = useRef<RotState>({
    rot: [-50, -15, 0],
    autoRot: true,
    dragging: false,
    lastT: 0,
    lastInteraction: 0,
  });

  // Render loop + sizing.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let started = false;

    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const draw = (W: number, H: number) => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.46;

      const projection = geoOrthographic()
        .scale(R)
        .translate([cx, cy])
        .rotate(s.rot)
        .clipAngle(90);
      const path = geoPath(projection, ctx);

      // Outer atmosphere glow.
      const glow = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25);
      glow.addColorStop(0, "rgba(204,255,0,0.10)");
      glow.addColorStop(1, "rgba(204,255,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Sphere fill.
      const sphereFill = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.35,
        R * 0.1,
        cx,
        cy,
        R,
      );
      sphereFill.addColorStop(0, "#1A1A1A");
      sphereFill.addColorStop(0.6, "#101010");
      sphereFill.addColorStop(1, "#050505");
      ctx.beginPath();
      path({ type: "Sphere" } as GeoPermissibleObjects);
      ctx.fillStyle = sphereFill;
      ctx.fill();

      // Graticule.
      ctx.beginPath();
      path(GRATICULE as unknown as GeoPermissibleObjects);
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Continents — lime → white-hot ramp by nationality density.
      const density = densityRef.current;
      const maxN = Math.max(1, ...Object.values(density));
      for (const f of COUNTRIES.features) {
        const iso = isoNumericToAlpha2(f.id as string | number | undefined);
        const count = iso ? density[iso] ?? 0 : 0;
        const tHeat = Math.min(1, count / maxN);
        const r = Math.round(204 + (255 - 204) * tHeat);
        const g = 255;
        const b = Math.round(255 * tHeat);
        const a = count > 0 ? 0.18 + tHeat * 0.55 : 0.06;
        ctx.beginPath();
        path(f as unknown as GeoPermissibleObjects);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fill();
        ctx.lineWidth = count > 0 ? 0.9 : 0.5;
        ctx.strokeStyle =
          count > 0
            ? `rgba(${r},${g},${b},${Math.min(0.9, 0.4 + tHeat * 0.5)})`
            : "rgba(204,255,0,0.18)";
        ctx.stroke();

        if (count > 0) {
          ctx.save();
          ctx.shadowColor = `rgba(204,255,0,${0.35 + tHeat * 0.4})`;
          ctx.shadowBlur = 14 + tHeat * 16;
          ctx.beginPath();
          path(f as unknown as GeoPermissibleObjects);
          ctx.fillStyle = `rgba(204,255,0,${0.05 + tHeat * 0.15})`;
          ctx.fill();
          ctx.restore();
        }
      }

      // Rim.
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(204,255,0,0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    const tick = (now: number) => {
      const s = stateRef.current;
      if (!s.lastT) s.lastT = now;
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const dt = Math.min(60, now - s.lastT);
      s.lastT = now;

      if (s.autoRot && !s.dragging && !reduceRef.current) {
        s.rot[0] += (dt / 1000) * 4.5; // ~0.75 RPM
      }
      if (!s.autoRot && !s.dragging && now - s.lastInteraction > 4000) {
        s.autoRot = true;
      }
      while (s.rot[0] > 180) s.rot[0] -= 360;
      while (s.rot[0] < -180) s.rot[0] += 360;

      draw(W, H);
      if (!started) {
        started = true;
        onReadyRef.current?.();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    // Some embedded contexts mount with visibilityState === 'hidden', which
    // halts rAF; re-arm on visibility + a setTimeout kickstart so the canvas
    // paints at least once.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const kickstart = window.setTimeout(() => {
      if (!started) tick(performance.now());
    }, 120);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(kickstart);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Pointer interactions: drag to rotate, click a country to filter.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    let drag0: { x: number; y: number; rot: [number, number, number] } | null =
      null;

    const onDown = (e: PointerEvent) => {
      drag0 = { x: e.clientX, y: e.clientY, rot: [...s.rot] };
      s.dragging = true;
      s.autoRot = false;
      s.lastInteraction = performance.now();
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!s.dragging || !drag0) return;
      const dx = e.clientX - drag0.x;
      const dy = e.clientY - drag0.y;
      s.rot = [
        drag0.rot[0] + dx * 0.35,
        Math.max(-80, Math.min(80, drag0.rot[1] - dy * 0.3)),
        0,
      ];
    };
    const onUp = (e: PointerEvent) => {
      const moved =
        drag0 && Math.hypot(e.clientX - drag0.x, e.clientY - drag0.y) > 4;
      const wasDrag = drag0;
      drag0 = null;
      s.dragging = false;
      s.lastInteraction = performance.now();

      if (!moved && wasDrag && onCountryClickRef.current) {
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        const R = Math.min(W, H) * 0.46;
        const projection = geoOrthographic()
          .scale(R)
          .translate([W / 2, H / 2])
          .rotate(s.rot)
          .clipAngle(90);
        const inv = projection.invert?.([mx, my]);
        if (inv) {
          for (const f of COUNTRIES.features as Feature[]) {
            if (geoContains(f as unknown as GeoPermissibleObjects as never, inv)) {
              const iso = isoNumericToAlpha2(
                f.id as string | number | undefined,
              );
              if (iso) onCountryClickRef.current(iso);
              break;
            }
          }
        }
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={wrapRef} className="globe-canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}
