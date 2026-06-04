"use client";

// BallersHub /players (Scouting Phase 2) — interactive globe with city pins.
//
// Now that teams carry coordinates, the globe is the real "map of talent":
//   • continents tinted by nationality density (lime → white-hot)
//   • a luminous pin per city with players, sized by how many
//   • drag to rotate / auto-rotate when idle / click a country to filter
//   • hover a pin → highlight it + report to the table (bidirectional sync)
//   • fly-to: when the table asks (focusCity), the camera eases to that city
//
// Each frame it writes every visible pin's screen position into
// `pinPositionsRef` so the HoverCard can glide glued to its pin without
// triggering React re-renders. Canvas 2D + d3-geo orthographic, world-atlas
// bundled. Dynamically imported (ssr:false) by the hero.

import { useEffect, useRef, type MutableRefObject } from "react";
import {
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import { isoNumericToAlpha2 } from "@/lib/scouting/isoNumeric";
import type { PinPos, ScoutCity } from "@/lib/scouting/types";

type AtlasTopology = Parameters<typeof feature>[0];
const TOPO = worldAtlas as unknown as AtlasTopology;
const COUNTRIES = feature(
  TOPO,
  TOPO.objects.countries,
) as unknown as FeatureCollection;
const GRATICULE = geoGraticule10();

type GlobeState = {
  rot: [number, number, number];
  targetRot: { from: [number, number, number]; to: [number, number, number]; t0: number; dur: number } | null;
  autoRot: boolean;
  dragging: boolean;
  lastT: number;
  lastInteraction: number;
  /** Camera zoom multiplier (1 = default framing). */
  zoom: number;
  pinHits: { key: string; x: number; y: number }[];
};

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 3.5;

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export default function ScoutGlobe({
  cities,
  countryDensity,
  focusCity = null,
  hoverPin = null,
  onHoverPin,
  onClickPin,
  onCountryClick,
  onReady,
  reduceMotion = false,
  quality = "high",
  showZoomControls = false,
  freezeRotation = false,
  pinPositionsRef,
}: {
  cities: ScoutCity[];
  countryDensity: Record<string, number>;
  focusCity?: string | null;
  hoverPin?: string | null;
  onHoverPin?: (key: string | null) => void;
  onClickPin?: (key: string) => void;
  onCountryClick?: (iso2: string) => void;
  onReady?: () => void;
  reduceMotion?: boolean;
  /** "low" trims per-frame cost (dpr + glow passes) for smooth mobile drag. */
  quality?: "high" | "low";
  /** Render the +/- zoom buttons (top-right). */
  showZoomControls?: boolean;
  /** Hold the globe still (no auto-rotate) — used while a card panel is open. */
  freezeRotation?: boolean;
  pinPositionsRef?: MutableRefObject<Map<string, PinPos>>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Latest props for the render loop to read without restarting.
  const citiesRef = useRef(cities);
  citiesRef.current = cities;
  const densityRef = useRef(countryDensity);
  densityRef.current = countryDensity;
  const hoverPinRef = useRef(hoverPin);
  hoverPinRef.current = hoverPin;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const freezeRef = useRef(freezeRotation);
  freezeRef.current = freezeRotation;
  const onHoverPinRef = useRef(onHoverPin);
  onHoverPinRef.current = onHoverPin;
  const onClickPinRef = useRef(onClickPin);
  onClickPinRef.current = onClickPin;
  const onClickCountryRef = useRef(onCountryClick);
  onClickCountryRef.current = onCountryClick;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const stateRef = useRef<GlobeState>({
    // Open on the Atlantic-facing view (center ≈ 45°W, 12°N): Latin America to
    // the left, Europe/Africa to the right, tilted north so the northern
    // hemisphere reads and pins don't ride up under the hero title. d3 centers
    // on (−λ, −φ), so [45, -12] ⇒ (−45, 12).
    rot: [45, -12, 0],
    targetRot: null,
    autoRot: true,
    dragging: false,
    lastT: 0,
    lastInteraction: 0,
    zoom: 1,
    pinHits: [],
  });

  // Fly-to: when the parent sets a focus city, ease the camera to it.
  useEffect(() => {
    if (!focusCity) return;
    const city = citiesRef.current.find((c) => c.key === focusCity);
    if (!city) return;
    const s = stateRef.current;
    const target: [number, number, number] = [
      -city.longitude,
      Math.max(-80, Math.min(80, -city.latitude)),
      0,
    ];
    const norm = (a: number, b: number) => {
      let d = b - a;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      return a + d;
    };
    s.targetRot = {
      from: [...s.rot],
      to: [norm(s.rot[0], target[0]), target[1], 0],
      t0: performance.now(),
      dur: 1100,
    };
    s.autoRot = false;
    s.lastInteraction = performance.now();
  }, [focusCity]);

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
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        qualityRef.current === "low" ? 1.5 : 2,
      );
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
      const R = Math.min(W, H) * 0.46 * s.zoom;

      const projection = geoOrthographic()
        .scale(R)
        .translate([cx, cy])
        .rotate(s.rot)
        .clipAngle(90);
      const path = geoPath(projection, ctx);

      // Atmosphere glow.
      const glow = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25);
      glow.addColorStop(0, "rgba(204,255,0,0.10)");
      glow.addColorStop(1, "rgba(204,255,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Sphere.
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

      // Continents — heat by nationality density.
      const density = densityRef.current;
      const maxN = Math.max(1, ...Object.values(density));
      for (const f of COUNTRIES.features) {
        const iso = isoNumericToAlpha2(f.id as string | number | undefined);
        const count = iso ? density[iso] ?? 0 : 0;
        const tHeat = Math.min(1, count / maxN);
        const r = Math.round(204 + (255 - 204) * tHeat);
        const b = Math.round(255 * tHeat);
        const a = count > 0 ? 0.18 + tHeat * 0.55 : 0.06;
        ctx.beginPath();
        path(f as unknown as GeoPermissibleObjects);
        ctx.fillStyle = `rgba(${r},255,${b},${a})`;
        ctx.fill();
        ctx.lineWidth = count > 0 ? 0.9 : 0.5;
        ctx.strokeStyle =
          count > 0
            ? `rgba(${r},255,${b},${Math.min(0.9, 0.4 + tHeat * 0.5)})`
            : "rgba(204,255,0,0.18)";
        ctx.stroke();
        // The shadow-blurred glow pass is the priciest part of the frame; skip
        // it on low quality (mobile) so dragging stays at 60fps.
        if (count > 0 && qualityRef.current !== "low") {
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

      // City pins.
      const hits: GlobeState["pinHits"] = [];
      const positions = pinPositionsRef?.current;
      const center: [number, number] = [-s.rot[0], -s.rot[1]];
      for (const city of citiesRef.current) {
        const proj = projection([city.longitude, city.latitude]);
        if (!proj) continue;
        const dist = geoDistance([city.longitude, city.latitude], center);
        const onFront = dist < Math.PI / 2 - 0.02;
        const [x, y] = proj;
        if (positions) positions.set(city.key, { x, y, onFront });
        if (!onFront) continue;

        const isHover = city.key === hoverPinRef.current;
        const sz = 2 + Math.min(6, city.players.length) * 0.9;

        ctx.save();
        const haloR = isHover ? sz * 6 : sz * 3.2;
        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        halo.addColorStop(0, isHover ? "rgba(255,255,255,0.55)" : "rgba(204,255,0,0.55)");
        halo.addColorStop(1, "rgba(204,255,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? "#FFFFFF" : "#CCFF00";
        ctx.shadowColor = isHover ? "#FFFFFF" : "#CCFF00";
        ctx.shadowBlur = isHover ? 14 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHover) {
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 22);
          ctx.stroke();
        }
        hits.push({ key: city.key, x, y });
      }
      s.pinHits = hits;
    };

    const tick = (now: number) => {
      const s = stateRef.current;
      if (!s.lastT) s.lastT = now;
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const dt = Math.min(60, now - s.lastT);
      s.lastT = now;

      if (s.autoRot && !s.dragging && !s.targetRot && !reduceRef.current && !freezeRef.current) {
        // Auto-rotate rightward (reversed from the old leftward drift), so the
        // map opens on Latin America and spins toward the right.
        s.rot[0] -= (dt / 1000) * 4.5;
      }
      if (
        !freezeRef.current &&
        !s.autoRot &&
        !s.dragging &&
        !s.targetRot &&
        now - s.lastInteraction > 4000
      ) {
        s.autoRot = true;
      }
      if (s.targetRot) {
        const t = Math.min(1, (now - s.targetRot.t0) / s.targetRot.dur);
        const e = easeInOut(t);
        s.rot[0] = s.targetRot.from[0] + (s.targetRot.to[0] - s.targetRot.from[0]) * e;
        s.rot[1] = s.targetRot.from[1] + (s.targetRot.to[1] - s.targetRot.from[1]) * e;
        if (t >= 1) s.targetRot = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pointer interactions: drag, pin hover, click pin / country.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    let drag0: { x: number; y: number; rot: [number, number, number] } | null = null;

    const onDown = (e: PointerEvent) => {
      drag0 = { x: e.clientX, y: e.clientY, rot: [...s.rot] };
      s.dragging = true;
      s.autoRot = false;
      s.targetRot = null;
      s.lastInteraction = performance.now();
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      if (s.dragging && drag0) {
        const dx = e.clientX - drag0.x;
        const dy = e.clientY - drag0.y;
        s.rot = [
          drag0.rot[0] + dx * 0.35,
          Math.max(-80, Math.min(80, drag0.rot[1] - dy * 0.3)),
          0,
        ];
        return;
      }
      // Hover detection on pins.
      let best: string | null = null;
      let bestD = 18;
      for (const h of s.pinHits) {
        const d = Math.hypot(h.x - mx, h.y - my);
        if (d < bestD) {
          best = h.key;
          bestD = d;
        }
      }
      onHoverPinRef.current?.(best);
    };
    const onUp = (e: PointerEvent) => {
      const moved = drag0 && Math.hypot(e.clientX - drag0.x, e.clientY - drag0.y) > 4;
      const had = drag0;
      drag0 = null;
      s.dragging = false;
      s.lastInteraction = performance.now();
      if (moved || !had) return;

      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;

      // Pin tap takes precedence over country tap.
      let bestPin: string | null = null;
      let bestD = 22;
      for (const h of s.pinHits) {
        const d = Math.hypot(h.x - mx, h.y - my);
        if (d < bestD) {
          bestPin = h.key;
          bestD = d;
        }
      }
      if (bestPin && onClickPinRef.current) {
        onClickPinRef.current(bestPin);
        return;
      }
      if (!onClickCountryRef.current) return;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      const R = Math.min(W, H) * 0.46 * s.zoom;
      const projection = geoOrthographic()
        .scale(R)
        .translate([W / 2, H / 2])
        .rotate(s.rot)
        .clipAngle(90);
      const inv = projection.invert?.([mx, my]);
      if (!inv) return;
      for (const f of COUNTRIES.features as Feature[]) {
        if (geoContains(f as unknown as GeoPermissibleObjects as never, inv)) {
          const iso = isoNumericToAlpha2(f.id as string | number | undefined);
          if (iso) onClickCountryRef.current(iso);
          break;
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

  // Mutating the ref is enough — the rAF loop reads s.zoom every frame.
  const applyZoom = (factor: number) => {
    const s = stateRef.current;
    s.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s.zoom * factor));
  };

  return (
    <div ref={wrapRef} className="globe-canvas-wrap">
      <canvas ref={canvasRef} />
      {showZoomControls && (
        <div className="globe-controls">
          <button type="button" aria-label="Acercar el mapa" onClick={() => applyZoom(1.25)}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M7 2.5v9 M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" aria-label="Alejar el mapa" onClick={() => applyZoom(0.8)}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
