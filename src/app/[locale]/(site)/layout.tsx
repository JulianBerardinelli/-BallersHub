// app/(site)/layout.tsx
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/footer/SiteFooter";
import PublicDockGate from "@/components/layout/mobile-nav/PublicDockGate";
import { SiteMotionProvider } from "@/components/site/ui/motion";
import SiteAmbient from "@/components/site/ui/SiteAmbient";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-bh-black">
      <SiteAmbient />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <SiteMotionProvider>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-24 pt-[6.5rem]">
            {children}
          </main>
        </SiteMotionProvider>
        <SiteFooter />
        {/* Mobile-only spacer so the fixed floating dock never covers the
            footer's last line (the dock is ~82px tall + 16px inset). */}
        <div
          aria-hidden
          className="md:hidden"
          style={{ height: "calc(6.5rem + env(safe-area-inset-bottom, 0px))" }}
        />
        {/* Mobile floating dock — resolves auth/plan server-side, renders
            md:hidden. Guest → Acceder; logged-in → avatar + account sheet. */}
        <PublicDockGate />
      </div>
    </div>
  );
}
