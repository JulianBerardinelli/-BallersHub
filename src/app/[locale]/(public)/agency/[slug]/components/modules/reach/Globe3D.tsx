"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { geoOrthographic, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
// world-atlas ships TopoJSON in 110m / 50m / 10m resolutions. 110m is small
// (~80 KB) and looks great at this size.
import topology from "world-atlas/countries-110m.json";

import CountryFlag from "@/components/common/CountryFlag";
import { getCountryCoord } from "@/lib/agency/country-coordinates";

type Props = {
  countries: string[];
  /** Diameter in pixels. Default 420. */
  size?: number;
  /** Auto-rotation speed (deg per second). Default 8. Set to 0 to disable. */
  speed?: number;
  /** Highlighted country (drawn with the active marker style). */
  activeCode?: string | null;
  onActiveChange?: (code: string | null) => void;
  /** Map of ISO-2 → display label (used in the hover tooltip). */
  countryLabels?: Record<string, string>;
};

const TILT_DEG = 18;

// Convert the TopoJSON to GeoJSON once at module load. The world-atlas
// package's JSON typings don't match topojson-specification exactly so we
// route through `unknown` to keep the runtime contract tight without a
// type-only headache.
const worldGeo = feature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topology as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (topology as any).objects.countries,
) as unknown as GeoJSON.FeatureCollection;

/**
 * Pseudo-3D rotating globe rendered with d3-geo's orthographic projection
 * over an SVG sphere. We project both the world's land outlines and the
 * caller's country pins through the same projection so everything stays
 * aligned as the globe rotates. Rendering is canvas-free — pure SVG paths
 * recomputed each frame via requestAnimationFrame.
 */
export default function Globe3D({
  countries,
  size = 420,
  speed = 8,
  activeCode,
  onActiveChange,
  countryLabels = {},
}: Props) {
  const radius = size / 2 - 6;
  const center = size / 2;

  const reducedMotion = useReducedMotion();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const angleRef = useRef(0);
  const rafRef = useRef(0);
  const prevTsRef = useRef<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);

  // Continuous Y-axis rotation. Skip when the user prefers reduced motion.
  useEffect(() => {
    if (reducedMotion || speed === 0) return;
    const tick = (ts: number) => {
      const dt = prevTsRef.current ? (ts - prevTsRef.current) / 1000 : 0;
      prevTsRef.current = ts;
      angleRef.current = (angleRef.current + speed * dt) % 360;
      force();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      prevTsRef.current = 0;
    };
  }, [reducedMotion, speed]);

  // Snap the active pin to the front when an activeCode arrives via hover
  // from the country list. We rotate the globe to land that lng at the
  // center, so the pin and its label face the camera.
  useEffect(() => {
    if (!activeCode) return;
    const coord = getCountryCoord(activeCode);
    if (!coord) return;
    angleRef.current = coord.lng; // d3 negates internally; matches projection
    force();
  }, [activeCode]);

  // Build the d3 projection for the current rotation. We use
  // `rotate([-lambda, -phi])` on geoOrthographic — d3 rotates the globe in
  // the opposite direction of the angle, so negating gives a "spin
  // east-to-west" effect like Earth itself.
  const projection: GeoProjection = useMemo(() => {
    return geoOrthographic()
      .scale(radius)
      .translate([center, center])
      .clipAngle(90)
      .rotate([-angleRef.current, -TILT_DEG]);
    // The angle is captured by re-creating projection each render (force loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, center, angleRef.current]);

  const path = useMemo(() => geoPath(projection), [projection]);

  // Project each pin through the same projection. Anything that returns
  // null is on the far hemisphere and gets hidden.
  const pins = countries.map((code) => {
    const coord = getCountryCoord(code);
    if (!coord) return null;
    const projected = projection([coord.lng, coord.lat]);
    if (!projected) return null;
    // Compute depth for pin opacity — recreate the same dot product the
    // projection's clip uses so we can scale pin size/opacity by closeness
    // to the camera.
    const lambda = (-angleRef.current * Math.PI) / 180;
    const phi = (-TILT_DEG * Math.PI) / 180;
    const lng = (coord.lng * Math.PI) / 180;
    const lat = (coord.lat * Math.PI) / 180;
    const cosLat = Math.cos(lat);
    const x = cosLat * Math.cos(lng);
    const y = cosLat * Math.sin(lng);
    const z = Math.sin(lat);
    // Rotate around z-axis (lambda)
    const x1 = x * Math.cos(lambda) - y * Math.sin(lambda);
    const y1 = x * Math.sin(lambda) + y * Math.cos(lambda);
    const z1 = z;
    // Rotate around y-axis (phi)
    const x2 = x1 * Math.cos(phi) + z1 * Math.sin(phi);
    const z2 = -x1 * Math.sin(phi) + z1 * Math.cos(phi);
    void y1;
    void x2;
    const depth = z2; // 1 = camera-facing, -1 = back
    return {
      code,
      x: projected[0],
      y: projected[1],
      depth,
    };
  });

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer atmospheric glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 80px rgba(0,0,0,0.55), 0 0 90px color-mix(in srgb, var(--theme-accent) 22%, transparent)",
          background:
            "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--theme-accent) 9%, transparent), rgba(0,0,0,0.85) 75%)",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="globe-fill" cx="32%" cy="28%" r="78%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>
          <radialGradient id="globe-rim" cx="50%" cy="50%" r="52%">
            <stop offset="92%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="color-mix(in srgb, var(--theme-accent) 38%, transparent)" />
          </radialGradient>
          <radialGradient id="pin-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="globe-clip">
            <circle cx={center} cy={center} r={radius} />
          </clipPath>
        </defs>

        {/* Sphere fill */}
        <circle cx={center} cy={center} r={radius} fill="url(#globe-fill)" />

        {/* World map — countries projected through d3 orthographic */}
        <g clipPath="url(#globe-clip)">
          {/* Graticule (lat/lng grid) under the land for depth */}
          <path
            d={path({ type: "Sphere" } as never) ?? ""}
            fill="none"
            stroke="color-mix(in srgb, var(--theme-accent) 10%, transparent)"
            strokeWidth={0.6}
          />

          {/* Land — fill with soft accent tint, stroked at country borders */}
          <g
            fill="color-mix(in srgb, var(--theme-accent) 12%, transparent)"
            stroke="color-mix(in srgb, var(--theme-accent) 55%, transparent)"
            strokeWidth={0.55}
            strokeLinejoin="round"
            opacity={0.9}
          >
            {worldGeo.features.map((f, i) => {
              const d = path(f);
              if (!d) return null;
              return <path key={i} d={d} />;
            })}
          </g>

          {/* Equator */}
          <path
            d={
              path({
                type: "LineString",
                coordinates: Array.from({ length: 73 }, (_, i) => [
                  -180 + i * 5,
                  0,
                ]),
              } as never) ?? ""
            }
            fill="none"
            stroke="color-mix(in srgb, var(--theme-accent) 50%, transparent)"
            strokeWidth={0.9}
          />
        </g>

        {/* Outer rim */}
        <circle cx={center} cy={center} r={radius} fill="url(#globe-rim)" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--theme-accent) 45%, transparent)"
          strokeWidth={1}
        />

        {/* Pins (front hemisphere only) */}
        {pins.map((p) => {
          if (!p) return null;
          const isActive = p.code === activeCode || p.code === hovered;
          const depth01 = Math.max(0, Math.min(1, (p.depth + 0.05) / 1.05));
          const depthOpacity = 0.4 + 0.6 * depth01;
          const r = isActive ? 5.5 : 3.3;
          return (
            <g
              key={p.code}
              transform={`translate(${p.x}, ${p.y})`}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onMouseEnter={() => {
                setHovered(p.code);
                onActiveChange?.(p.code);
              }}
              onMouseLeave={() => {
                // Clear the local hover highlight, but DON'T reset the
                // parent's active code — the panel + globe should stay
                // locked on whatever country is selected so the UI doesn't
                // snap back to a neutral state on every cursor exit.
                setHovered(null);
              }}
            >
              {/* Halo (active state pulses) */}
              {isActive && (
                <circle r={14} fill="url(#pin-glow)" opacity={0.9}>
                  <animate
                    attributeName="r"
                    values="10;19;10"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.9;0.4;0.9"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle
                r={r}
                fill="var(--theme-accent)"
                opacity={depthOpacity}
                style={{ transition: "r 200ms cubic-bezier(0.25,0,0,1)" }}
              />
              <circle
                r={r * 0.45}
                fill="#ffffff"
                opacity={depthOpacity * 0.9}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating flag tooltip — anchored at the active pin */}
      {(() => {
        const activeCodeNorm = activeCode || hovered;
        if (!activeCodeNorm) return null;
        const pin = pins.find((p) => p && p.code === activeCodeNorm);
        if (!pin) return null;
        const label = countryLabels[activeCodeNorm] ?? activeCodeNorm;
        return (
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: pin.x,
              top: pin.y,
              transform: "translate(-50%, calc(-100% - 14px))",
            }}
          >
            <div
              className="flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap shadow-[0_8px_28px_rgba(0,0,0,0.6)]"
              style={{
                backgroundColor: "rgba(0,0,0,0.78)",
                border: "1px solid color-mix(in srgb, var(--theme-accent) 50%, transparent)",
                color: "var(--theme-accent)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <CountryFlag code={activeCodeNorm} size={14} />
              <span>{label}</span>
            </div>
            {/* Pointer triangle */}
            <div
              aria-hidden
              className="mx-auto"
              style={{
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid color-mix(in srgb, var(--theme-accent) 50%, transparent)",
                marginTop: -1,
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}
