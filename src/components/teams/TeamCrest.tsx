// src/components/team/TeamCrest.tsx
import Image from "next/image";

/**
 * Hosts cuyos crests sí pasan por el optimizer de Next (están en
 * `next.config.ts > images.remotePatterns`). Cualquier otro host externo
 * (logos de Transfermarkt en akamai, BeSoccer, etc.) renderiza
 * `unoptimized` — Next no es nuestro CDN para esos y meterlos por
 * `/_next/image` produce 400 `INVALID_IMAGE_OPTIMIZE_REQUEST`.
 */
const NEXT_OPTIMIZED_HOST_SUFFIXES = [".supabase.co"];

export function sanitizeCrestUrl(input: string): string {
  const trimmed = input.trim();
  // Algunos crests llegan desde admin con un `//` adicional en el path
  // (ej. "https://tmssl.akamaized.net//images/logo/..."), lo cual hace
  // que tanto la URL sea fea como que el image optimizer la rechace.
  // Colapsamos esas barras dobles preservando el `://` del esquema.
  try {
    const u = new URL(trimmed);
    u.pathname = u.pathname.replace(/\/{2,}/g, "/");
    return u.toString();
  } catch {
    // No es una URL absoluta — colapsamos a mano por si es un path
    // relativo con `//` perdido.
    return trimmed.replace(/([^:])\/{2,}/g, "$1/");
  }
}

export function shouldOptimize(url: string): boolean {
  if (url.endsWith(".svg")) return false;
  if (url.startsWith("/")) return true; // local public/
  try {
    const host = new URL(url).hostname;
    return NEXT_OPTIMIZED_HOST_SUFFIXES.some((s) => host.endsWith(s));
  } catch {
    return false;
  }
}

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
  const url = src && src.trim() ? sanitizeCrestUrl(src) : "/images/team-default.svg";
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
        unoptimized={!shouldOptimize(url)}
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
