// src/components/site/about/SectionBand.tsx
// Backdrop atmosférico para sections — NO es una caja.
//
// Diseño:
// - Sin border, sin rounded corners, sin padding wrapper.
// - Sólo agrega una capa decorativa absoluta detrás del contenido (z<0 dentro de
//   un stacking context aislado), que se manifiesta como glow lime/blue o
//   mesh band. Le da "color de fondo" a la sección sin encerrarla en una caja.
// - Pure CSS, server-only — performance neutral.
//
// Uso:
//   <SectionBand tone="lime"><MyContent /></SectionBand>
// El children fluye abierto; el glow sale por los costados sin clipping y crea
// transiciones orgánicas con la sección de arriba/abajo.

import type { ReactNode } from "react";

export type SectionTone = "lime" | "blue" | "mesh" | "neutral";

type Props = {
  tone: SectionTone;
  children: ReactNode;
  /** Variación del posicionamiento del glow (left|right). Default: alterna por tono. */
  side?: "left" | "right";
  className?: string;
};

export default function SectionBand({
  tone,
  children,
  side,
  className = "",
}: Props) {
  return (
    <div className={`relative isolate ${className}`}>
      <ToneBackdrop tone={tone} side={side} />
      {children}
    </div>
  );
}

/* ---------------------------------------------- */
/* Backdrop atmosférico                            */
/* ---------------------------------------------- */
function ToneBackdrop({
  tone,
  side,
}: {
  tone: SectionTone;
  side?: "left" | "right";
}) {
  if (tone === "neutral") return null;

  if (tone === "mesh") {
    // Banda de grid mesh con fade vertical — sensación "data / sistema"
    // sin encerrar nada. Se desvanece arriba y abajo para integrarse.
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] -inset-y-12 -z-10 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      />
    );
  }

  // lime / blue: un único glow grande, suave, asimétrico.
  // Se proyecta hacia afuera para integrarse con secciones vecinas.
  const isLime = tone === "lime";
  const accent = isLime ? "204,255,0" : "0,194,255";
  // default side: lime → izquierda, blue → derecha (alternancia natural)
  const resolvedSide = side ?? (isLime ? "left" : "right");

  const positionStyles =
    resolvedSide === "left"
      ? { top: "10%", left: "-12%" }
      : { top: "15%", right: "-12%" };

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-visible"
    >
      <div
        className="absolute h-[520px] w-[520px] rounded-full blur-[110px]"
        style={{
          ...positionStyles,
          background: `radial-gradient(circle, rgba(${accent},0.11) 0%, rgba(${accent},0.04) 35%, transparent 70%)`,
        }}
      />
      {/* Segundo glow más pequeño en esquina opuesta para balance */}
      <div
        className="absolute h-[280px] w-[280px] rounded-full blur-[90px]"
        style={{
          bottom: "5%",
          ...(resolvedSide === "left" ? { right: "-6%" } : { left: "-6%" }),
          background: `radial-gradient(circle, rgba(${accent},0.06) 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
