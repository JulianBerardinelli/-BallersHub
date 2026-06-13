import { useEffect } from "react";

import { STEPS } from "./steps";

// The workflow engine — ported 1:1 from the prototype's validation.js. It runs
// imperatively (refs + a polling requestAnimationFrame loop) and mutates inline
// styles / classes every frame; React only renders the static DOM. This is
// deliberate: per-frame React state would cause re-render storms, and a rAF
// poll of window.scrollY is robust where `scroll` events don't fire
// (programmatic scrolls, throttled/embedded contexts).
//
// Engine hooks are matched by cv-* class within the root ref, and the toggled
// state classes (cv-active / cv-done / cv-journey / …) are the same ones the
// stylesheet keys off.

type Cfg = { speed: number; anim: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export function useScrollEngine(
  rootRef: React.RefObject<HTMLElement | null>,
  cfg: Cfg,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Mobile (< md) renders the simple stacked version (ValidationFlowMobile);
    // the scrolljack is display:none there, so don't run the rAF engine.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return;
    const q = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) =>
      scope.querySelector<T>(sel);
    const qa = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) =>
      Array.from(scope.querySelectorAll<T>(sel));

    const experience = q<HTMLElement>(".cv-experience");
    const stage = q<HTMLElement>(".cv-stage");
    const svg = q<SVGSVGElement>(".cv-flow-svg");
    const spineTrack = q<SVGPathElement>(".cv-spine-track");
    const spineTrail = q<SVGPathElement>(".cv-spine-trail");
    const branchG = q<SVGGElement>(".cv-branch-edges");
    const exec = q<HTMLElement>(".cv-exec");
    const execIco = q<HTMLElement>(".cv-exec-ico");
    const heroTitle = q<HTMLElement>(".cv-hero-title");
    const nodesEl = q<HTMLElement>(".cv-nodes");
    const brSources = q<HTMLElement>(".cv-branch-sources");
    const brAgents = q<HTMLElement>(".cv-branch-agents");
    if (!experience || !stage || !svg || !spineTrack || !spineTrail || !branchG || !exec || !nodesEl || !brSources || !brAgents) return;

    const nodes = qa<HTMLElement>(".cv-node", nodesEl);
    const caps = qa<HTMLElement>(".cv-cap");
    const progDots = qa<HTMLElement>(".cv-pdot");
    const srcChips = qa<HTMLElement>(".cv-bnode", brSources);
    const agtChips = qa<HTMLElement>(".cv-bnode", brAgents);
    const N = nodes.length; // 6
    if (!N) return;

    const COLORS = STEPS.map((s) => s.color);
    const MORPH_END = 0.1;
    const SPINE_X = 0.535; // desktop "left" layout
    const pointer = { x: 0.5, y: 0.5 };
    let userInteracted = false;
    let lastActive = -1;

    // scroll length: higher speed = longer scroll = slower playback
    experience.style.height = 300 + cfg.speed * 60 + "vh";

    // branch edge <path>s (recreated each mount; cleared first for StrictMode)
    branchG.replaceChildren();
    const mkPath = () => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      branchG.appendChild(p);
      return p;
    };
    const srcEdges = srcChips.map(mkPath);
    const agtEdges = agtChips.map(mkPath);

    function nodeCenters(W: number, H: number, morph: number) {
      const mobile = W < 760;
      const sx = mobile ? 0.3 : SPINE_X;
      // horizontal intro: cap the row width (centered) so the nodes aren't glued
      // to the canvas edges on wide screens; small screens keep the full spread.
      const rowFrac = Math.min(0.85, 1200 / W);
      const hA = (1 - rowFrac) / 2, hY = 0.52;
      // vertical: start lower so the top nodes clear the fixed 80px header and the
      // column sits centered within the visible area below it.
      const vTop = mobile ? 0.15 : 0.17, vBot = mobile ? 0.52 : 0.92;
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        const hx = hA + rowFrac * f, hy = hY;
        const vx = sx, vy = vTop + (vBot - vTop) * f;
        out.push({ x: lerp(hx, vx, morph) * W, y: lerp(hy, vy, morph) * H });
      }
      return out;
    }

    function cardHalf(W: number) {
      const mobile = W < 760;
      return { hw: (mobile ? 150 : 200) / 2, hh: (mobile ? 46 : 64) / 2 };
    }

    function placeBranch(
      branchEl: HTMLElement,
      chips: HTMLElement[],
      edges: SVGElement[],
      parent: { x: number; y: number },
      W: number,
      H: number,
      hw: number,
      open: number,
      spread: number,
      fanXFrac: number,
    ) {
      const mobile = W < 760;
      const fanX = fanXFrac * W;
      const n = chips.length;
      const isOpen = open > 0.22;
      branchEl.classList.toggle("cv-open", isOpen);
      const px = parent.x + hw, py = parent.y; // parent right port
      chips.forEach((chip, k) => {
        const fy = parent.y + ((k - (n - 1) / 2) / Math.max(1, (n - 1) / 2)) * spread * H * (n > 1 ? 1 : 0);
        const cx = fanX, cy = n === 1 ? parent.y : fy;
        chip.style.left = cx + "px";
        chip.style.top = cy + "px";
        const chipHW = (mobile ? 112 : chip.classList.contains("cv-agent") ? 176 : 168) / 2;
        const ex = cx - chipHW;
        const dx = ex - px;
        const d = `M ${px.toFixed(1)} ${py.toFixed(1)} C ${(px + dx * 0.5).toFixed(1)} ${py.toFixed(1)} ${(ex - dx * 0.5).toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${cy.toFixed(1)}`;
        edges[k].setAttribute("d", d);
        edges[k].classList.toggle("cv-on", isOpen);
      });
    }

    function applyTilt(active: number) {
      const mag = cfg.anim; // 0..10 parallax depth
      caps.forEach((cp, i) => {
        const det = cp.querySelector<HTMLElement>(".cv-cap-detail");
        if (!det) return;
        if (i === active) {
          const ry = (pointer.x - 0.5) * mag, rx = (0.5 - pointer.y) * mag;
          det.style.transform = `perspective(820px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
        } else {
          det.style.transform = "";
        }
      });
    }

    function render() {
      const W = window.innerWidth, H = window.innerHeight;
      const scrollable = Math.max(1, experience!.offsetHeight - H);
      const p = clamp((window.scrollY - experience!.offsetTop) / scrollable, 0, 1);

      const mobile = W < 760;
      const morph = smooth(clamp(p / MORPH_END, 0, 1));
      const morphEff = mobile ? 1 : morph; // mobile starts vertical
      const journey = p > 0.045 && p < 0.997;
      stage!.classList.toggle("cv-journey", journey);
      // The scroll hint is an intro-only affordance: hide it as soon as scrolling
      // starts and keep it hidden. (Can't key off `journey` — that window closes
      // again at p≈1, which would wrongly re-show the hint over the last node.)
      stage!.classList.toggle("cv-rolling", p > 0.02);
      svg!.setAttribute("viewBox", `0 0 ${W} ${H}`);

      const c = nodeCenters(W, H, morphEff);
      const { hw } = cardHalf(W);

      // fade the graph in over the intro on mobile (hero carries the first frame)
      const gOpacity = mobile ? smooth(clamp(p / MORPH_END, 0, 1)) : 1;
      nodesEl!.style.opacity = String(gOpacity);
      svg!.style.opacity = String(gOpacity);

      nodes.forEach((n, i) => { n.style.left = c[i].x + "px"; n.style.top = c[i].y + "px"; });

      // spine path through centers (morphing bezier)
      let d = `M ${c[0].x.toFixed(1)} ${c[0].y.toFixed(1)}`;
      for (let i = 1; i < N; i++) {
        const a = c[i - 1], b = c[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const cp1x = a.x + (1 - morphEff) * dx * 0.42, cp1y = a.y + morphEff * dy * 0.42;
        const cp2x = b.x - (1 - morphEff) * dx * 0.42, cp2y = b.y - morphEff * dy * 0.42;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
      spineTrack!.setAttribute("d", d);
      spineTrail!.setAttribute("d", d);
      const len = spineTrack!.getTotalLength();

      // execution progress
      const tj = clamp((p - MORPH_END) / (1 - MORPH_END), 0, 1);
      const seg = tj * (N - 1);
      const base = Math.floor(clamp(seg, 0, N - 1 - 1e-4));
      const lightFrac = clamp((base + smooth(seg - base)) / (N - 1), 0, 1);

      spineTrail!.style.strokeDasharray = String(len);
      spineTrail!.style.strokeDashoffset = String(len * (1 - lightFrac));
      const pt = spineTrack!.getPointAtLength(lightFrac * len);
      exec!.style.left = pt.x + "px"; exec!.style.top = pt.y + "px";
      exec!.style.opacity = journey ? "1" : "0";

      const active = clamp(Math.round(seg), 0, N - 1);

      // branches: narrow open windows so they never overlap during the hand-off
      const openSrc = journey ? clamp(1 - Math.abs(seg - 2) / 0.6, 0, 1) : 0;
      const openAgt = journey ? clamp(1 - Math.abs(seg - 3) / 0.6, 0, 1) : 0;
      const fanXFrac = mobile ? 0.74 : SPINE_X + 0.255;
      placeBranch(brSources!, srcChips, srcEdges, c[2], W, H, hw, openSrc, mobile ? 0.165 : 0.3, fanXFrac);
      placeBranch(brAgents!, agtChips, agtEdges, c[3], W, H, hw, openAgt, mobile ? 0.1 : 0.135, fanXFrac);

      // re-run state toggles when active OR journey changes (fixes step-01 not
      // showing on first morph)
      const stateKey = active * 2 + (journey ? 1 : 0);
      if (stateKey !== lastActive) {
        lastActive = stateKey;
        const beam = COLORS[active];
        svg!.style.setProperty("--beam", beam);
        exec!.style.setProperty("--beam", beam);
        const ico = nodes[active]?.querySelector(".cv-node-ico");
        if (execIco && ico) execIco.innerHTML = ico.innerHTML;
        nodes.forEach((n, i) => {
          n.classList.toggle("cv-active", i === active && journey);
          n.classList.toggle("cv-done", i < active && journey);
        });
        caps.forEach((cp, i) => cp.classList.toggle("cv-is-active", i === active && journey));
        progDots.forEach((dt, i) => {
          dt.classList.toggle("cv-on", i === active && journey);
          dt.classList.toggle("cv-passed", i < active && journey);
        });
      }

      // hero fade
      heroTitle!.style.opacity = String(1 - smooth(clamp(p / (MORPH_END * 0.85), 0, 1)));
      heroTitle!.style.transform = `translateY(${-morph * 36}px) scale(${1 - morph * 0.1})`;

      applyTilt(active);
    }

    // ---------- rAF loop (polls scrollY; robust vs missing scroll events) ----------
    let lastY = -1, lastPx = -1, lastPy = -1, raf = 0;
    function loop() {
      const y = window.scrollY;
      if (y !== lastY || pointer.x !== lastPx || pointer.y !== lastPy) {
        lastY = y; lastPx = pointer.x; lastPy = pointer.y;
        try { render(); } catch { /* swallow transient layout errors */ }
      }
      raf = requestAnimationFrame(loop);
    }
    try { render(); } catch { /* first paint */ } // synchronous first frame
    raf = requestAnimationFrame(loop);

    const onScroll = () => { lastY = -1; };
    const onResize = () => { lastY = -1; lastActive = -2; };
    const onMove = (e: MouseEvent) => { pointer.x = e.clientX / window.innerWidth; pointer.y = e.clientY / window.innerHeight; };
    const markInteracted = () => { userInteracted = true; };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove, { passive: true });
    (["wheel", "touchstart", "keydown"] as const).forEach((ev) =>
      window.addEventListener(ev, markInteracted, { passive: true, once: true }),
    );

    // ---------- auto-advance after idle (gentle nudge into the vertical morph) ----------
    const tweenTo = (targetY: number, dur: number) => {
      const startY = window.scrollY, dist = targetY - startY, t0 = performance.now();
      const step = (now: number) => {
        if (userInteracted) return;
        const t = clamp((now - t0) / dur, 0, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        window.scrollTo(0, startY + dist * e);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const idleTimer = window.setTimeout(() => {
      if (userInteracted || window.scrollY > 12) return;
      const scrollable = experience.offsetHeight - window.innerHeight;
      tweenTo(experience.offsetTop + scrollable * (MORPH_END + 0.05), 1500);
    }, 3400);

    // ---------- progress dot navigation ----------
    const dotHandlers: Array<() => void> = [];
    progDots.forEach((dot, i) => {
      const h = () => {
        userInteracted = true;
        const scrollable = experience.offsetHeight - window.innerHeight;
        const targetP = MORPH_END + (1 - MORPH_END) * (i / (N - 1));
        window.scrollTo({ top: experience.offsetTop + scrollable * targetP, behavior: "smooth" });
      };
      dot.addEventListener("click", h);
      dotHandlers.push(h);
    });

    // ---------- decision toggle (approve / reject) ----------
    const verdict = q<HTMLElement>(".cv-verdict");
    const decideBtns = qa<HTMLButtonElement>(".cv-decide-toggle button");
    const decideHandlers: Array<() => void> = [];
    decideBtns.forEach((b) => {
      const h = () => {
        const mode = b.dataset.mode;
        decideBtns.forEach((x) => x.classList.remove("cv-on-approve", "cv-on-reject"));
        b.classList.add(mode === "approve" ? "cv-on-approve" : "cv-on-reject");
        if (verdict) {
          verdict.classList.toggle("cv-approve", mode === "approve");
          verdict.classList.toggle("cv-reject", mode === "reject");
          const ap = verdict.querySelector<HTMLElement>("[data-approve]");
          const rj = verdict.querySelector<HTMLElement>("[data-reject]");
          if (ap) ap.style.display = mode === "approve" ? "" : "none";
          if (rj) rj.style.display = mode === "reject" ? "" : "none";
        }
      };
      b.addEventListener("click", h);
      decideHandlers.push(h);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      (["wheel", "touchstart", "keydown"] as const).forEach((ev) =>
        window.removeEventListener(ev, markInteracted),
      );
      progDots.forEach((dot, i) => dot.removeEventListener("click", dotHandlers[i]));
      decideBtns.forEach((b, i) => b.removeEventListener("click", decideHandlers[i]));
    };
  }, [rootRef, cfg]);
}
