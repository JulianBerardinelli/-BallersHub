// Dotted 3D globe for the /players OG card, rendered as a standalone SVG
// string and embedded via an <img> data URI.
//
// Why a string and not JSX <circle>s: Satori would have to lay out ~900
// nodes individually (slow + risks the element budget). A pre-built SVG
// drawn once is sharp and cheap. Ported 1:1 from the design handoff
// (`og-cards.jsx → Globe3D`): a sphere of dots with depth (size/opacity by
// z), four highlighted hub nodes, and connection arcs between front hubs.

export function globeSvg(size = 400, accent = "#CCFF00"): string {
  const R = size / 2;
  const rows = 30;
  const tilt = -0.42;
  const proj = 0.9;

  type P = { x: number; y: number; z: number };
  const dots: P[] = [];
  for (let i = 0; i <= rows; i++) {
    const phi = (Math.PI * i) / rows;
    const y0 = Math.cos(phi);
    const r = Math.sin(phi);
    const count = Math.max(1, Math.round(rows * 1.7 * r));
    for (let j = 0; j < count; j++) {
      const theta = (2 * Math.PI * j) / count;
      const x = r * Math.cos(theta);
      const z0 = r * Math.sin(theta);
      const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
      const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
      dots.push({ x, y, z });
    }
  }
  const px = (d: P) => size / 2 + d.x * R * proj;
  const py = (d: P) => size / 2 - d.y * R * proj;

  const hub: P[] = (
    [
      [0.35, 0.9],
      [-0.2, 2.1],
      [0.55, 3.6],
      [-0.45, 5.1],
    ] as [number, number][]
  ).map(([la, lo]) => {
    const r = Math.cos(la);
    const y0 = Math.sin(la);
    const x = r * Math.cos(lo);
    const z0 = r * Math.sin(lo);
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    return { x, y, z };
  });

  const f = (n: number) => Math.round(n * 100) / 100;
  const parts: string[] = [];
  parts.push(
    `<circle cx="${size / 2}" cy="${size / 2}" r="${f(R * proj + 6)}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`,
  );
  for (const d of dots) {
    const depth = (d.z + 1) / 2;
    parts.push(
      `<circle cx="${f(px(d))}" cy="${f(py(d))}" r="${f(0.7 + depth * 1.9)}" fill="${accent}" opacity="${f(0.1 + depth * 0.62)}"/>`,
    );
  }
  hub.forEach((a, i) => {
    const b = hub[(i + 1) % hub.length];
    if (a.z < 0 && b.z < 0) return;
    const mx = (px(a) + px(b)) / 2;
    const my = (py(a) + py(b)) / 2;
    const cx = mx + (my - size / 2) * -0.25;
    const cy = my + (mx - size / 2) * -0.25;
    parts.push(
      `<path d="M${f(px(a))},${f(py(a))} Q${f(cx)},${f(cy)} ${f(px(b))},${f(py(b))}" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0.5"/>`,
    );
  });
  hub
    .filter((d) => d.z > -0.1)
    .forEach((d) => {
      parts.push(
        `<circle cx="${f(px(d))}" cy="${f(py(d))}" r="7" fill="${accent}" opacity="0.18"/>`,
        `<circle cx="${f(px(d))}" cy="${f(py(d))}" r="3.4" fill="${accent}"/>`,
      );
    });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${parts.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
