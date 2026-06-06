// House ad / sponsor slot. The owner explicitly wanted ad space on the
// blog ("banners a los costados para publicidad"). These are presentational
// placeholders — drop a real creative or ad-network embed in later.

export function AdBanner({
  variant = "vertical",
  label = "Publicidad",
}: {
  variant?: "vertical" | "horizontal";
  label?: string;
}) {
  const isV = variant === "vertical";
  return (
    <div
      className="relative flex w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-bh-lg border border-dashed border-white/[0.12] bg-white/[0.02] p-4"
      style={isV ? { height: 600 } : { minHeight: 110 }}
    >
      <span className="absolute left-2.5 top-2 font-bh-mono text-[9px] uppercase tracking-[0.12em] text-bh-fg-4">
        {label}
      </span>
      <div className="text-center font-bh-display text-[22px] font-bold leading-[1.05] text-bh-fg-3">
        {isV ? (
          <>
            ESPACIO
            <br />
            300 × 600
          </>
        ) : (
          "ESPACIO 728 × 90"
        )}
      </div>
      <span className="font-bh-body text-[11.5px] text-bh-fg-3">Banner disponible</span>
    </div>
  );
}
