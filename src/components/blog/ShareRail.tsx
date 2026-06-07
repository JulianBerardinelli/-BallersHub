// Share buttons with real share intents (X / LinkedIn / WhatsApp). Server
// component — the share URLs are derived from the canonical post URL passed
// in, so no client JS is needed.

const ICON: Record<string, React.ReactNode> = {
  x: (
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  ),
  in: (
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
  ),
  wa: (
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.513 5.26l-.999 3.648 3.575-.937zm5.49-12.69c.124.001.262.001.397.001.124 0 .323-.046.484.371.165.426.561 1.477.611 1.585.05.108.083.234.017.378-.066.144-.099.234-.198.36-.099.124-.207.277-.297.372-.099.108-.202.225-.087.422.116.198.514.847 1.104 1.373.758.676 1.398.886 1.596.985.198.099.314.083.43-.05.116-.133.494-.578.626-.776.132-.198.264-.165.446-.099.182.066 1.157.546 1.355.645.198.099.33.149.38.231.05.083.05.479-.116.941z" />
  ),
};

export function ShareRail({
  url,
  title,
  vertical = false,
}: {
  url: string;
  title: string;
  vertical?: boolean;
}) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links: { key: string; href: string; label: string }[] = [
    { key: "x", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, label: "Compartir en X" },
    { key: "in", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, label: "Compartir en LinkedIn" },
    { key: "wa", href: `https://wa.me/?text=${t}%20${u}`, label: "Compartir en WhatsApp" },
  ];

  return (
    <div className={vertical ? "sticky top-24 flex flex-col items-center gap-2.5" : "flex items-center gap-2.5"}>
      {!vertical && (
        <span className="mr-1 font-bh-mono text-[11.5px] text-bh-fg-3">Compartir</span>
      )}
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-bh-md border border-white/10 bg-white/[0.03] text-bh-fg-2 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-bh-fg-1"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            {ICON[l.key]}
          </svg>
        </a>
      ))}
    </div>
  );
}
