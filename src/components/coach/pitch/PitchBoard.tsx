// PitchBoard — render READ-ONLY de una pizarra táctica (Ideas de Juego).
// Componente puro (sin hooks, sin "use client") → se usa tanto en el server
// component público como dentro del editor client. Dibuja la cancha + las
// flechas (SVG overlay) + las fichas (divs absolutos). Coordenadas en % (0-100),
// cancha vertical (y=0 ataque arriba, y=100 arco propio abajo).
//
// El editor interactivo (PitchBoardEditor) reusa estos sub-render para que el
// tablero se vea idéntico en edición y en público.

import type { PitchArrow, PitchToken, PitchBoard as PitchBoardData } from "@/lib/coach/game-ideas";

// La cancha mantiene aspect 2/3 (ancho/alto). El viewBox del SVG de flechas usa
// 100 x 150 para casar ese aspecto (100 de ancho, 150 de alto en las mismas
// unidades % que las fichas → x en [0,100], y mapeado a [0,150]).
const VB_W = 100;
const VB_H = 150;
const yToVb = (y: number) => (y / 100) * VB_H;

export const TEAM_COLORS = {
  own: { fill: "var(--pitch-own, #ccff00)", text: "#0a0a0a" },
  opponent: { fill: "var(--pitch-opp, #ef4444)", text: "#ffffff" },
} as const;

/** Color de cada tipo de flecha (independiente del equipo). */
function arrowColor(kind: PitchArrow["kind"]): string {
  if (kind === "run") return "var(--pitch-arrow-run, #38bdf8)";
  if (kind === "dribble") return "var(--pitch-arrow-dribble, #f59e0b)";
  return "var(--pitch-arrow-pass, #ffffff)";
}

function ArrowPath({ a }: { a: PitchArrow }) {
  const x1 = a.fromX;
  const y1 = yToVb(a.fromY);
  const x2 = a.toX;
  const y2 = yToVb(a.toY);
  const color = arrowColor(a.kind);
  const markerId = `arrowhead-${a.kind}`;

  if (a.kind === "run") {
    // Curva suave: punto de control desplazado perpendicular al medio.
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const off = Math.min(len * 0.22, 18);
    const cx = mx - (dy / len) * off;
    const cy = my + (dx / len) * off;
    return (
      <path
        d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeDasharray="4 3"
        markerEnd={`url(#${markerId})`}
        opacity={0.9}
      />
    );
  }

  if (a.kind === "dribble") {
    // Zigzag entre los dos puntos.
    const segs = 5;
    const dx = (x2 - x1) / segs;
    const dy = (y2 - y1) / segs;
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const nlen = Math.hypot(nx, ny) || 1;
    const amp = 3;
    let d = `M ${x1} ${y1}`;
    for (let i = 1; i < segs; i++) {
      const px = x1 + dx * i + (nx / nlen) * amp * (i % 2 === 0 ? 1 : -1);
      const py = y1 + dy * i + (ny / nlen) * amp * (i % 2 === 0 ? 1 : -1);
      d += ` L ${px} ${py}`;
    }
    d += ` L ${x2} ${y2}`;
    return (
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        markerEnd={`url(#${markerId})`}
        opacity={0.9}
      />
    );
  }

  // pass: recta sólida.
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={1.4}
      markerEnd={`url(#${markerId})`}
      opacity={0.95}
    />
  );
}

function Token({ t, size }: { t: PitchToken; size: number }) {
  if (t.kind === "ball") {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-white shadow"
        style={{ left: `${t.x}%`, top: `${t.y}%`, width: size * 0.62, height: size * 0.62 }}
        aria-hidden
      />
    );
  }
  if (t.kind === "cone") {
    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${t.x}%`, top: `${t.y}%`, width: 0, height: 0 }}
        aria-hidden
      >
        <div
          style={{
            borderLeft: `${size * 0.28}px solid transparent`,
            borderRight: `${size * 0.28}px solid transparent`,
            borderBottom: `${size * 0.55}px solid #f97316`,
            transform: "translate(-50%, -60%)",
          }}
        />
      </div>
    );
  }
  const c = TEAM_COLORS[t.team];
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bh-display font-black shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-1 ring-black/30"
      style={{
        left: `${t.x}%`,
        top: `${t.y}%`,
        width: size,
        height: size,
        backgroundColor: c.fill,
        color: c.text,
        fontSize: size * 0.42,
      }}
    >
      {t.label ?? ""}
    </div>
  );
}

/** SVG overlay con todas las flechas + sus markers. Reusado por el editor. */
export function PitchArrowsSvg({ arrows }: { arrows: PitchArrow[] }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {(["pass", "run", "dribble"] as const).map((kind) => (
          <marker
            key={kind}
            id={`arrowhead-${kind}`}
            markerWidth="6"
            markerHeight="6"
            refX="4.5"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowColor(kind)} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => (
        <ArrowPath key={a.id} a={a} />
      ))}
    </svg>
  );
}

/** Wrapper de cancha (markings + estilo) reusado por render y editor. */
export const PITCH_BG =
  "linear-gradient(to bottom, color-mix(in srgb, var(--pitch-own, #ccff00) 6%, #0d0d0d), #0a0a0a)";

export default function PitchBoard({
  board,
  tokenSize = 26,
  className = "",
}: {
  board: PitchBoardData;
  /** Diámetro de las fichas en px. */
  tokenSize?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl ${className}`}
      style={{
        aspectRatio: "2 / 3",
        background: PITCH_BG,
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <PitchMarkings />
      <PitchArrowsSvg arrows={board.arrows} />
      {board.tokens.map((t) => (
        <Token key={t.id} t={t} size={tokenSize} />
      ))}
    </div>
  );
}

/** Líneas/áreas de la cancha (decorativo). Comparte el look del FormationDiagram. */
export function PitchMarkings() {
  const line = "rgba(255,255,255,0.14)";
  return (
    <>
      {/* Línea media */}
      <span className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2" style={{ backgroundColor: line }} />
      {/* Círculo central */}
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ border: `1px solid ${line}` }}
      />
      {/* Área superior (rival) */}
      <span
        className="pointer-events-none absolute left-1/2 top-0 h-[12%] w-1/2 -translate-x-1/2 rounded-b-md"
        style={{ border: `1px solid ${line}`, borderTop: "none" }}
      />
      {/* Área inferior (propia) */}
      <span
        className="pointer-events-none absolute left-1/2 bottom-0 h-[12%] w-1/2 -translate-x-1/2 rounded-t-md"
        style={{ border: `1px solid ${line}`, borderBottom: "none" }}
      />
    </>
  );
}
