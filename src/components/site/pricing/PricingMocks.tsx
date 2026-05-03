// Default device-frame placeholders for the pricing detail panel.
// The DeviceFrame components are intentionally generic — each scene
// renders one with a lightweight placeholder UI inside that's easy to
// swap for a real screenshot later (replace `<PlaceholderScreen .../>`
// with `<img src="/screens/foo.png" alt="..."/>` or your preferred mock).

import { Image as ImageIcon } from "lucide-react";

export type DeviceKind = "desktop" | "tablet" | "mobile";
export type Accent = "lime" | "blue" | "neutral";

// ----------------------- Device shells ------------------------

export function DeviceFrame({
  kind,
  accent = "neutral",
  caption,
  children,
}: {
  kind: DeviceKind;
  accent?: Accent;
  caption?: string;
  children: React.ReactNode;
}) {
  if (kind === "desktop") return <DesktopShell accent={accent} caption={caption}>{children}</DesktopShell>;
  if (kind === "tablet") return <TabletShell accent={accent} caption={caption}>{children}</TabletShell>;
  return <MobileShell accent={accent} caption={caption}>{children}</MobileShell>;
}

function DesktopShell({
  accent,
  caption,
  children,
}: {
  accent: Accent;
  caption?: string;
  children: React.ReactNode;
}) {
  const dotClass =
    accent === "lime"
      ? "bg-bh-lime/80"
      : accent === "blue"
        ? "bg-bh-blue/70"
        : "bg-white/35";
  return (
    <figure className="bh-glass-strong relative overflow-hidden rounded-bh-xl border border-white/[0.10]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-black/30 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        {caption && (
          <span className="ml-3 truncate font-bh-mono text-[10px] tracking-[0.06em] text-bh-fg-3 md:text-[11px]">
            {caption}
          </span>
        )}
        <span className="ml-auto rounded-bh-pill border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-bh-fg-4">
          Desktop
        </span>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-black/20">
        {children}
      </div>
    </figure>
  );
}

function TabletShell({
  accent,
  caption,
  children,
}: {
  accent: Accent;
  caption?: string;
  children: React.ReactNode;
}) {
  const ring =
    accent === "blue"
      ? "border-[rgba(0,194,255,0.18)]"
      : accent === "lime"
        ? "border-[rgba(204,255,0,0.18)]"
        : "border-white/[0.10]";
  return (
    <figure className="mx-auto w-full max-w-md">
      <div
        className={`bh-glass-strong rounded-[28px] border-2 ${ring} p-2.5 shadow-[0_24px_48px_rgba(0,0,0,0.4)]`}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-black/40">
          {/* Camera bezel */}
          <div className="absolute left-1/2 top-1.5 z-20 h-1 w-1 -translate-x-1/2 rounded-full bg-white/30" />
          {children}
        </div>
      </div>
      {caption && (
        <figcaption className="mt-2 text-center font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function MobileShell({
  accent,
  caption,
  children,
}: {
  accent: Accent;
  caption?: string;
  children: React.ReactNode;
}) {
  const ring =
    accent === "blue"
      ? "border-[rgba(0,194,255,0.20)]"
      : accent === "lime"
        ? "border-[rgba(204,255,0,0.20)]"
        : "border-white/[0.12]";
  return (
    <figure className="mx-auto w-full max-w-[280px]">
      <div
        className={`bh-glass-strong rounded-[36px] border-2 ${ring} p-1.5 shadow-[0_24px_48px_rgba(0,0,0,0.45)]`}
      >
        <div className="relative aspect-[9/19.5] overflow-hidden rounded-[28px] bg-black/45">
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-20 flex h-5 w-24 -translate-x-1/2 items-center justify-center rounded-full bg-black">
            <span className="h-1 w-12 rounded-full bg-white/15" />
          </div>
          {children}
        </div>
      </div>
      {caption && (
        <figcaption className="mt-2 text-center font-bh-mono text-[10px] uppercase tracking-[0.14em] text-bh-fg-4">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ----------------------- Placeholder content ------------------------

const ACCENT_GRADIENT: Record<Accent, string> = {
  lime: "from-[rgba(204,255,0,0.22)] via-white/[0.02] to-[rgba(0,194,255,0.16)]",
  blue: "from-[rgba(0,194,255,0.22)] via-white/[0.02] to-[rgba(204,255,0,0.16)]",
  neutral: "from-white/[0.10] via-white/[0.02] to-white/[0.06]",
};

const ACCENT_TEXT: Record<Accent, string> = {
  lime: "text-bh-lime",
  blue: "text-bh-blue",
  neutral: "text-bh-fg-2",
};

/**
 * Generic placeholder UI rendered inside a DeviceFrame.
 * Three layout variants give visual variety across scenes.
 * Replace with a real <img> or richer component when screenshots ship.
 */
export function PlaceholderScreen({
  accent = "neutral",
  variant = "profile",
  device = "desktop",
}: {
  accent?: Accent;
  variant?: "profile" | "dashboard" | "search";
  device?: DeviceKind;
}) {
  return (
    <div className="relative h-full w-full">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${ACCENT_GRADIENT[accent]}`}
      />
      <div
        className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]"
        aria-hidden
      />

      <div className="relative h-full w-full p-4 md:p-6">
        {variant === "profile" && (
          <ProfileVariant accent={accent} device={device} />
        )}
        {variant === "dashboard" && (
          <DashboardVariant accent={accent} device={device} />
        )}
        {variant === "search" && (
          <SearchVariant accent={accent} device={device} />
        )}
      </div>

      {/* Default-mockup watermark — remove when real content ships */}
      <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-bh-pill border border-white/[0.08] bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-bh-fg-4 backdrop-blur">
        <ImageIcon className="h-2.5 w-2.5" />
        Mockup default
      </div>
    </div>
  );
}

function Bar({ width, accent = "neutral" }: { width: string; accent?: Accent }) {
  const cls =
    accent === "lime"
      ? "bg-[rgba(204,255,0,0.55)]"
      : accent === "blue"
        ? "bg-[rgba(0,194,255,0.55)]"
        : "bg-white/15";
  return (
    <div
      className={`h-1.5 rounded-full ${cls}`}
      style={{ width }}
    />
  );
}

function ProfileVariant({
  accent,
  device,
}: {
  accent: Accent;
  device: DeviceKind;
}) {
  const isMobile = device === "mobile";
  return (
    <div className={`flex h-full flex-col ${isMobile ? "gap-3 pt-7" : "gap-5"}`}>
      <header
        className={`flex items-center gap-3 ${isMobile ? "flex-col text-center" : ""}`}
      >
        <div
          className={`shrink-0 rounded-full bg-gradient-to-br from-white/30 to-white/5 ${
            isMobile ? "h-14 w-14" : "h-16 w-16 md:h-20 md:w-20"
          }`}
        />
        <div className={`flex-1 space-y-1.5 ${isMobile ? "items-center" : ""}`}>
          <div
            className={`h-2.5 rounded-full bg-white/25 ${isMobile ? "mx-auto w-32" : "w-40"}`}
          />
          <div
            className={`h-1.5 rounded-full bg-white/15 ${isMobile ? "mx-auto w-24" : "w-28"}`}
          />
        </div>
        {!isMobile && (
          <span
            className={`rounded-bh-pill border bg-black/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur ${
              accent === "blue"
                ? "border-[rgba(0,194,255,0.35)] text-bh-blue"
                : "border-[rgba(204,255,0,0.35)] text-bh-lime"
            }`}
          >
            Verificado
          </span>
        )}
      </header>

      <div className={`grid gap-2 ${isMobile ? "grid-cols-3" : "grid-cols-3"}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-bh-md border border-white/[0.08] bg-black/20 p-2.5"
          >
            <Bar width="80%" accent={accent} />
            <div className="mt-1.5 h-1 w-1/2 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      {!isMobile && (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`aspect-video overflow-hidden rounded-bh-md border border-white/[0.06] bg-gradient-to-br ${ACCENT_GRADIENT[accent]}`}
            />
          ))}
        </div>
      )}

      <div className="mt-auto space-y-1.5">
        <Bar width="100%" />
        <Bar width="86%" />
        <Bar width="64%" />
      </div>
    </div>
  );
}

function DashboardVariant({
  accent,
  device,
}: {
  accent: Accent;
  device: DeviceKind;
}) {
  const isMobile = device === "mobile";
  return (
    <div className={`flex h-full flex-col ${isMobile ? "gap-3 pt-7" : "gap-4"}`}>
      <header className="flex items-center justify-between">
        <Bar width="40%" />
        <span
          className={`rounded-bh-pill border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
            accent === "blue"
              ? "border-[rgba(0,194,255,0.30)] bg-[rgba(0,194,255,0.10)] text-bh-blue"
              : "border-[rgba(204,255,0,0.30)] bg-[rgba(204,255,0,0.10)] text-bh-lime"
          }`}
        >
          Pro
        </span>
      </header>

      <div className={`grid gap-2 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {(isMobile ? [1, 2] : [1, 2, 3, 4]).map((i) => (
          <div
            key={i}
            className="rounded-bh-md border border-white/[0.08] bg-black/20 p-2.5"
          >
            <div
              className={`font-bh-display text-base font-black leading-none ${ACCENT_TEXT[accent]} md:text-lg`}
            >
              {["+212", "+18", "4.9", "32%"][i - 1]}
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      <div className="flex-1 rounded-bh-md border border-white/[0.08] bg-black/20 p-3">
        <div className="flex h-full items-end gap-1">
          {(isMobile
            ? [50, 70, 40, 80, 65]
            : [40, 62, 35, 78, 55, 88, 72, 60, 92, 68, 80, 95]
          ).map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t bg-gradient-to-t ${
                accent === "blue"
                  ? "from-[rgba(0,194,255,0.20)] to-bh-blue"
                  : "from-[rgba(204,255,0,0.20)] to-bh-lime"
              }`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {!isMobile && (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-bh-md border border-white/[0.06] bg-black/20 px-3 py-2"
            >
              <div
                className={`h-6 w-6 rounded-full bg-gradient-to-br ${ACCENT_GRADIENT[accent]}`}
              />
              <div className="flex-1 space-y-1">
                <Bar width={`${80 - i * 10}%`} />
                <div className="h-1 w-1/3 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchVariant({
  accent,
  device,
}: {
  accent: Accent;
  device: DeviceKind;
}) {
  const isMobile = device === "mobile";
  return (
    <div className={`flex h-full flex-col ${isMobile ? "gap-3 pt-7" : "gap-4"}`}>
      <div
        className={`flex items-center gap-2 rounded-bh-md border border-white/[0.08] bg-black/30 px-3 py-2 ${
          accent === "blue"
            ? "ring-1 ring-[rgba(0,194,255,0.25)]"
            : "ring-1 ring-[rgba(204,255,0,0.18)]"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${accent === "blue" ? "bg-bh-blue" : "bg-bh-lime"}`}
        />
        <Bar width="60%" />
      </div>

      <div className="flex flex-wrap gap-1">
        {(isMobile ? [1, 2, 3] : [1, 2, 3, 4, 5]).map((i) => (
          <span
            key={i}
            className="h-5 rounded-bh-pill border border-white/[0.08] bg-white/[0.04] px-3"
          />
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        {(isMobile ? [1, 2, 3] : [1, 2, 3, 4, 5]).map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-bh-md border border-white/[0.06] bg-black/20 px-3 py-2"
          >
            <div
              className={`h-7 w-7 rounded-full bg-gradient-to-br ${ACCENT_GRADIENT[accent]}`}
            />
            <div className="flex-1 space-y-1">
              <Bar width={`${82 - i * 6}%`} />
              <div className="h-1 w-1/3 rounded-full bg-white/10" />
            </div>
            <span
              className={`rounded-bh-pill border px-1.5 py-0.5 text-[9px] font-bold ${
                accent === "blue"
                  ? "border-[rgba(0,194,255,0.30)] bg-[rgba(0,194,255,0.10)] text-bh-blue"
                  : "border-[rgba(204,255,0,0.30)] bg-[rgba(204,255,0,0.10)] text-bh-lime"
              }`}
            >
              {[95, 92, 88, 85, 82][i - 1]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
