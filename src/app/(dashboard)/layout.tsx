// app/(dashboard)/layout.tsx

import SiteHeader from "@/components/layout/SiteHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <SiteHeader/>
          
        {children}
      </main>
    </>
  );
}
