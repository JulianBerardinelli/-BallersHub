// Dedicated layout for the checkout flow.
// Replaces the SiteHeader / SiteFooter chrome of `(site)` so the page
// reads as a focused payment surface — no navigation away, no marketing
// noise. The framer-motion provider is still in place because the form
// uses motion components.

import CheckoutTopbar from "@/components/site/checkout/CheckoutTopbar";
import CheckoutFooterMini from "@/components/site/checkout/CheckoutFooterMini";
import { SiteMotionProvider } from "@/components/site/ui/motion";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative isolate min-h-screen overflow-x-clip bg-bh-black"
      style={{
        // Subtle ambient washes matching the Claude Design checkout shell.
        backgroundImage:
          "radial-gradient(1200px 700px at 80% -20%, rgba(204,255,0,0.06), transparent 60%), radial-gradient(900px 600px at 0% 110%, rgba(0,194,255,0.04), transparent 60%)",
      }}
    >
      <div className="relative z-10 flex min-h-screen flex-col">
        <CheckoutTopbar />
        <SiteMotionProvider>
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 pb-16 pt-7 md:px-12 md:pt-9">
            {children}
          </main>
        </SiteMotionProvider>
        <CheckoutFooterMini />
      </div>
    </div>
  );
}
