// app/(site)/layout.tsx
import SiteHeader from "@/components/layout/SiteHeader";
import { SiteMotionProvider } from "@/components/site/ui/motion";
import SiteAmbient from "@/components/site/ui/SiteAmbient";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen bg-bh-black">
      <SiteAmbient />
      <div className="relative z-10">
        <SiteHeader />
        <SiteMotionProvider>
          <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-6">{children}</main>
        </SiteMotionProvider>
      </div>
    </div>
  );
}
