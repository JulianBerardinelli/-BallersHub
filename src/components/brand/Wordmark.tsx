// Brand wordmark — Variant 03 (apostrophe + BALLERS lime, HUB white).
// Apostrophe color is iterable via the `apostropheColor` prop.

type WordmarkProps = {
  size?: "nav" | "hero" | "display";
  apostropheColor?: string;
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<WordmarkProps["size"]>, string> = {
  nav: "text-xl tracking-[0.01em]",
  hero: "text-4xl md:text-5xl tracking-[0.005em]",
  display: "text-6xl md:text-7xl lg:text-8xl tracking-[-0.005em]",
};

export function Wordmark({
  size = "nav",
  apostropheColor,
  className = "",
}: WordmarkProps) {
  const apos = apostropheColor ?? "var(--bh-lime-200)";
  return (
    <span
      aria-label="'BallersHub"
      className={`font-bh-display font-black uppercase leading-none select-none ${SIZE_CLASSES[size]} ${className}`}
    >
      <span style={{ color: apos }}>&apos;</span>
      <span className="text-bh-lime">BALLERS</span>
      <span className="text-bh-fg-1">HUB</span>
    </span>
  );
}
