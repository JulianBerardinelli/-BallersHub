// Cover art for blog cards / hero / article cover.
//
// When the post has a hero image we render it (next/image, optimized for
// the supabase blog-media bucket). When it doesn't, we render on-brand
// generative art: a cluster-tinted gradient + geometric motif (pitch /
// network / radar / grid) + a faint oversized glyph + noise — so the grid
// never shows an empty "Sin imagen" box.

import Image from "next/image";
import type { BlogCluster } from "@/db/schema";
import {
  accentForCluster,
  CLUSTER_MOTIF,
  CLUSTER_GLYPH,
  type CoverMotif,
} from "@/lib/blog/clusterAccent";

// blog-media lives on *.supabase.co → next/image can optimize it. External
// URLs (legacy MVP-1 posts) fall back to unoptimized.
function isOptimizable(url: string): boolean {
  return url.includes(".supabase.co");
}

function MotifLayer({ motif, color }: { motif: CoverMotif; color: string }) {
  const common = "absolute inset-0 h-full w-full";
  const op = 0.55;
  if (motif === "radar") {
    return (
      <svg className={common} style={{ opacity: op }} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[44, 92, 140, 188].map((r, i) => (
          <circle key={i} cx="70" cy="210" r={r} fill="none" stroke={color} strokeWidth="1.1" opacity={0.5 - i * 0.09} />
        ))}
        <line x1="70" y1="210" x2="330" y2="40" stroke={color} strokeWidth="1.1" opacity="0.4" />
        {[[150, 150], [230, 90], [120, 70], [300, 150]].map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={color} opacity="0.7" />
        ))}
      </svg>
    );
  }
  if (motif === "network") {
    const pts = [[60, 60], [160, 40], [300, 80], [110, 150], [230, 170], [340, 150], [180, 100]];
    const edges = [[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [0, 3], [1, 2], [3, 4], [4, 5]];
    return (
      <svg className={common} style={{ opacity: op }} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {edges.map((e, i) => (
          <line key={i} x1={pts[e[0]][0]} y1={pts[e[0]][1]} x2={pts[e[1]][0]} y2={pts[e[1]][1]} stroke={color} strokeWidth="1" opacity="0.3" />
        ))}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === 6 ? 5 : 3.2} fill={color} opacity={i === 6 ? 0.85 : 0.55} />
        ))}
      </svg>
    );
  }
  if (motif === "grid") {
    const pid = "bhg" + color.replace("#", "");
    return (
      <svg className={common} style={{ opacity: op }} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <pattern id={pid} width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke={color} strokeWidth="0.8" opacity="0.45" />
          </pattern>
        </defs>
        <rect width="400" height="240" fill={`url(#${pid})`} />
        <rect x="68" y="68" width="34" height="34" fill={color} opacity="0.25" />
        <rect x="170" y="102" width="34" height="34" fill={color} opacity="0.4" />
      </svg>
    );
  }
  // pitch (default)
  return (
    <svg className={common} style={{ opacity: op }} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="20" y="20" width="360" height="200" rx="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <line x1="200" y1="20" x2="200" y2="220" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <circle cx="200" cy="120" r="44" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <rect x="20" y="72" width="56" height="96" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <rect x="324" y="72" width="56" height="96" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")";

export function CoverArt({
  slug,
  cluster,
  heroImageUrl,
  alt,
  priority = false,
  sizes,
  imgClassName = "",
}: {
  slug: string;
  cluster: BlogCluster;
  heroImageUrl: string | null;
  alt: string;
  priority?: boolean;
  sizes?: string;
  imgClassName?: string;
}) {
  const accent = accentForCluster(cluster);

  if (heroImageUrl) {
    return (
      <Image
        src={heroImageUrl}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        unoptimized={!isOptimizable(heroImageUrl)}
        className={`object-cover ${imgClassName}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      data-cover-slug={slug}
      className="absolute inset-0 h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(130% 100% at 80% 0%, ${accent.soft} 0%, transparent 50%), linear-gradient(155deg, #171717 0%, #0c0c0c 100%)`,
      }}
    >
      <MotifLayer motif={CLUSTER_MOTIF[cluster]} color={accent.color} />
      <div className="absolute inset-0" style={{ opacity: 0.5, mixBlendMode: "overlay", backgroundImage: NOISE_BG }} />
      <span
        className="pointer-events-none absolute select-none font-bh-display font-black leading-none"
        style={{ right: 18, bottom: -18, fontSize: 124, color: accent.color, opacity: 0.13, letterSpacing: "-0.02em" }}
      >
        {CLUSTER_GLYPH[cluster]}
      </span>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 28%)" }} />
    </div>
  );
}
