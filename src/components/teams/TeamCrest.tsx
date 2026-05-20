// src/components/team/TeamCrest.tsx
import Image from "next/image";

export default function TeamCrest({
  src,
  name = "Club",
  size = 18,
  className = "",
  title,
}: {
  src?: string | null;
  name?: string;
  size?: number;         // px
  className?: string;
  title?: string;
}) {
  const url = src && src.trim() ? src : "/images/team-default.svg";
  const px = `${size}px`;
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: px, height: px }}
      title={title ?? name}
    >
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        // Crests are tiny and load in long lists (rosters, career
        // tables) — leave the default lazy loading; no priority.
        // unoptimized for SVG defaults; Next can still optimize the
        // remote raster crests from Supabase.
        unoptimized={url.endsWith(".svg")}
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
