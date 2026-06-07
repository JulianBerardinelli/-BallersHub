// Lógica de dibujo del globo — PORTADA de `src/components/scouting/ScoutGlobe.tsx`.
// Misma proyección (geoOrthographic + geoPath sobre canvas) y mismo look (atmósfera,
// esfera, retícula, países heat-mapped, rim, pins luminosos). La diferencia: acá la
// rotación/zoom NO vienen de drag/rAF sino de la cámara dirigida por frame (Remotion),
// y se quitan hover/click/selección. Se agrega `appear` (0..1) por pin para el stagger.
import { geoDistance, geoOrthographic, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { COUNTRIES, GRATICULE } from "./geo";
import { isoNumericToAlpha2 } from "../../lib/scouting/isoNumeric";
import type { GlobeCity } from "./cities";

export type DrawCity = GlobeCity & { appear: number };

export type DrawParams = {
  W: number;
  H: number;
  cx: number;
  cy: number;
  R: number;
  rot: [number, number, number];
  cities: DrawCity[];
  density: Record<string, number>;
};

export function drawGlobe(ctx: CanvasRenderingContext2D, p: DrawParams): void {
  const { W, H, cx, cy, R, rot, cities, density } = p;
  ctx.clearRect(0, 0, W, H);

  const projection = geoOrthographic()
    .scale(R)
    .translate([cx, cy])
    .rotate(rot)
    .clipAngle(90);
  const path = geoPath(projection, ctx);

  // Atmósfera.
  const glow = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.25);
  glow.addColorStop(0, "rgba(204,255,0,0.10)");
  glow.addColorStop(1, "rgba(204,255,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
  ctx.fill();

  // Esfera.
  const sphereFill = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  sphereFill.addColorStop(0, "#1A1A1A");
  sphereFill.addColorStop(0.6, "#101010");
  sphereFill.addColorStop(1, "#050505");
  ctx.beginPath();
  path({ type: "Sphere" } as GeoPermissibleObjects);
  ctx.fillStyle = sphereFill;
  ctx.fill();

  // Retícula.
  ctx.beginPath();
  path(GRATICULE as unknown as GeoPermissibleObjects);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Continentes — heat por cuántos jugadores juegan en cada país.
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

  // Pins de ciudades (solo las del hemisferio visible).
  const center: [number, number] = [-rot[0], -rot[1]];
  for (const city of cities) {
    if (city.appear <= 0) continue;
    const proj = projection([city.longitude, city.latitude]);
    if (!proj) continue;
    const dist = geoDistance([city.longitude, city.latitude], center);
    const onFront = dist < Math.PI / 2 - 0.02;
    if (!onFront) continue;
    const [x, y] = proj;
    const sz = Math.max(0.01, (2 + Math.min(6, city.playerCount) * 0.9) * city.appear);

    ctx.save();
    const haloR = sz * 3.2;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0, `rgba(204,255,0,${0.55 * city.appear})`);
    halo.addColorStop(1, "rgba(204,255,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, sz, 0, Math.PI * 2);
    ctx.fillStyle = "#CCFF00";
    ctx.shadowColor = "#CCFF00";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
