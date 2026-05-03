// app/(site)/layout.tsx
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/footer/SiteFooter";
import { SiteMotionProvider } from "@/components/site/ui/motion";
import SiteAmbient from "@/components/site/ui/SiteAmbient";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen bg-bh-black">
      <SiteAmbient />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <SiteMotionProvider>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-24 pt-[6.5rem]">
            {children}
          </main>
        </SiteMotionProvider>
        <SiteFooter />
      </div>
    </div>
  );
}
