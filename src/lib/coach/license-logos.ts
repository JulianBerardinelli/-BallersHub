// Maps a coach license issuer (or title) to a known federation logo + brand
// color, and classifies the supporting document so the public portfolio can
// decide between an in-app modal (PDF/image) and an external redirect (_blank).
//
// Logos live in /public/brands/licenses/*.png (sourced from the federations'
// favicons). Unknown issuers fall back to a branded monogram badge.

export type LicenseFederation = {
  key: string;
  /** Display label for the body. */
  label: string;
  /** Logo asset under /public, or null → render the monogram fallback. */
  src: string | null;
  /** Brand color for the monogram badge / accent. */
  color: string;
  /** 2–4 char monogram fallback. */
  abbr: string;
};

// Order matters: more specific keywords first. Each entry's `match` array is
// tested (lowercased, accent-insensitive) against `${issuer} ${title}`.
const FEDERATIONS: Array<LicenseFederation & { match: string[] }> = [
  { key: "uefa", label: "UEFA", src: "/brands/licenses/uefa.png", color: "#00337f", abbr: "UEFA", match: ["uefa"] },
  { key: "fifa", label: "FIFA", src: "/brands/licenses/fifa.png", color: "#326295", abbr: "FIFA", match: ["fifa"] },
  { key: "conmebol", label: "CONMEBOL", src: "/brands/licenses/conmebol.png", color: "#1f3a93", abbr: "CSF", match: ["conmebol"] },
  { key: "concacaf", label: "CONCACAF", src: "/brands/licenses/concacaf.png", color: "#c8102e", abbr: "CCF", match: ["concacaf"] },
  { key: "afa", label: "AFA", src: "/brands/licenses/afa.png", color: "#6cb4e4", abbr: "AFA", match: ["afa", "argentin"] },
  { key: "figc", label: "FIGC", src: "/brands/licenses/figc.png", color: "#0066b3", abbr: "FIGC", match: ["figc", "italian", "italia"] },
  { key: "rfef", label: "RFEF", src: "/brands/licenses/rfef.png", color: "#c60b1e", abbr: "RFEF", match: ["rfef", "espanol", "spanish", "spain"] },
  { key: "thefa", label: "The FA", src: "/brands/licenses/thefa.png", color: "#1e1e3c", abbr: "FA", match: ["the fa", "english fa", "football association", "english football"] },
  { key: "dfb", label: "DFB", src: "/brands/licenses/dfb.png", color: "#000000", abbr: "DFB", match: ["dfb", "german", "deutsch"] },
  { key: "fff", label: "FFF", src: "/brands/licenses/fff.png", color: "#21304f", abbr: "FFF", match: ["fff", "french", "france", "francais"] },
];

const deaccent = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Resolve a federation from the issuer/title, or null for a generic fallback. */
export function federationFor(issuer: string | null, title: string | null): LicenseFederation | null {
  const hay = deaccent(`${issuer ?? ""} ${title ?? ""}`);
  for (const fed of FEDERATIONS) {
    if (fed.match.some((m) => hay.includes(m))) {
      const { match: _m, ...rest } = fed;
      void _m;
      return rest;
    }
  }
  return null;
}

export type LicenseDocKind = "pdf" | "image" | "external" | null;

/** Classify a doc_url so the UI can pick modal (pdf/image) vs _blank (external). */
export function licenseDocKind(url: string | null): LicenseDocKind {
  if (!url) return null;
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (/\.(jpe?g|png|webp|avif|gif)$/.test(clean)) return "image";
  return "external";
}
