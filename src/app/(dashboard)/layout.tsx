// app/(dashboard)/layout.tsx

import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/footer/SiteFooter";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
