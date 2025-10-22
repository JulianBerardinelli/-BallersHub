// app/(site)/layout.tsx
import SiteHeader from "@/components/layout/SiteHeader";
import { SiteMotionProvider } from "@/components/site/ui/motion";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <SiteMotionProvider>
        <main className="mx-auto max-w-7xl py-6">{children}</main>
      </SiteMotionProvider>
    </>
  );
}
