// app/(site)/layout.tsx
import SiteHeader from "@/components/layout/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl py-6">{children}</main>
    </>
  );
}
