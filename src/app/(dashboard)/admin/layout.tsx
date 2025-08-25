// app/(admin)/layout.tsx
import SiteHeader from "@/components/layout/SiteHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>

      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
