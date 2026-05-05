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
    <div className="relative isolate min-h-screen overflow-x-clip bg-bh-black">
      <div className="relative z-10 flex min-h-screen flex-col">
        <CheckoutTopbar />
        <SiteMotionProvider>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-10 md:px-6 md:pt-12">
            {children}
          </main>
        </SiteMotionProvider>
        <CheckoutFooterMini />
      </div>
    </div>
  );
}
