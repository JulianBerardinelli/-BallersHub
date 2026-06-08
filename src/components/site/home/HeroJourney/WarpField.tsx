"use client";

// HeroJourney — WarpField: a radial particle stream + central light bloom that
// sells "flying into the planet" during the dive. Active only when intensity > 0
// (read live from the shared `intensityRef`, set by the journey from scroll `p`).

import * as React from "react";

type WarpProps = {
  accent: string;
  intensityRef: React.RefObject<number>;
};

export default function WarpField({ accent, intensityRef }: WarpProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let W = 0;
    let H = 0;
    let stop = false;
    let cleared = true;
    const hex = (accent || "#CCFF00").replace("#", "");
    const ar = parseInt(hex.slice(0, 2), 16);
    const ag = parseInt(hex.slice(2, 4), 16);
    const ab = parseInt(hex.slice(4, 6), 16);

    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = r.width;
      H = r.height;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const N = 150;
    type Particle = { a: number; r: number; spd: number; w: number; white: boolean; pr: number };
    const parts: Particle[] = [];
    const reset = (p: Particle, spread: boolean) => {
      p.a = Math.random() * Math.PI * 2;
      p.r = spread ? Math.random() * Math.hypot(W, H) * 0.55 + 6 : Math.random() * 26 + 5;
      p.spd = 0.7 + Math.random() * 1.2;
      p.w = Math.random() < 0.15 ? 1.7 + Math.random() * 1.6 : 0.5 + Math.random() * 0.9;
      p.white = Math.random() < 0.3;
      p.pr = p.r;
    };
    for (let i = 0; i < N; i++) {
      const p = {} as Particle;
      reset(p, true);
      parts.push(p);
    }

    const tick = () => {
      if (stop) return;
      const inten = intensityRef.current || 0;
      if (inten < 0.012) {
        if (!cleared) {
          ctx.clearRect(0, 0, W, H);
          cleared = true;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      cleared = false;
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5;
      const cy = H * 0.5;
      const maxR = Math.hypot(W, H) * 0.62;

      // central light bloom that breathes with the dive
      const lr = Math.min(W, H) * (0.3 + inten * 0.65);
      const lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, lr);
      lg.addColorStop(0, `rgba(255,255,255,${(inten * 0.16).toFixed(3)})`);
      lg.addColorStop(0.35, `rgba(${ar},${ag},${ab},${(inten * 0.13).toFixed(3)})`);
      lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);

      // streaming particles (warp trails), additive for glow
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.pr = p.r;
        const speed = (1.3 + p.r * 0.013) * p.spd * (1.4 + inten * 9);
        p.r += speed;
        const ca = Math.cos(p.a);
        const sa = Math.sin(p.a);
        const x = cx + ca * p.r;
        const y = cy + sa * p.r;
        const x0 = cx + ca * p.pr;
        const y0 = cy + sa * p.pr;
        const fade = Math.min(1, p.r / (maxR * 0.55));
        const alpha = inten * (0.12 + fade * 0.72);
        ctx.strokeStyle = p.white ? `rgba(255,255,255,${alpha.toFixed(3)})` : `rgba(${ar},${ag},${ab},${alpha.toFixed(3)})`;
        ctx.lineWidth = p.w * (1 + fade * 1.7);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
        ctx.stroke();
        if (p.r > maxR) reset(p, false);
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [accent, intensityRef]);

  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
