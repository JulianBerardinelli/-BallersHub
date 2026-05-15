// Ambient lime + blue orbs and grid mesh for the marketing site.
// Pure CSS animations (keyframes live in globals.css).

export default function SiteAmbient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute -left-24 -top-32 h-[600px] w-[600px] rounded-full blur-[50px]"
        style={{
          background:
            "radial-gradient(circle, rgba(204,255,0,0.14) 0%, transparent 70%)",
          animation: "bh-orb-1 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-12 right-[5%] h-[500px] w-[500px] rounded-full blur-[60px]"
        style={{
          background:
            "radial-gradient(circle, rgba(0,194,255,0.11) 0%, transparent 70%)",
          animation: "bh-orb-2 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-[35%] top-[45%] h-[300px] w-[300px] rounded-full blur-[70px]"
        style={{
          background:
            "radial-gradient(circle, rgba(204,255,0,0.07) 0%, transparent 70%)",
          animation: "bh-orb-3 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 90% at 50% 50%, black 30%, transparent 100%)",
        }}
      />
    </div>
  );
}
