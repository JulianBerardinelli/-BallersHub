// Dedicated topbar for the checkout flow. Replaces SiteHeader so the
// chrome is unambiguous: "you're in payment, not browsing".
//
// Sticky on scroll like SiteHeader but visually quieter.

import Image from "next/image";
import Link from "next/link";
import { Lock, MessageCircleQuestion } from "lucide-react";

export default function CheckoutTopbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bh-black/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-6 md:px-12">
        <Link href="/" className="flex items-center" aria-label="Volver al inicio">
          <Image
            src="/images/logo/imagotipo-full_white.svg"
            alt="'BallersHub"
            width={140}
            height={28}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-bh-pill border border-white/[0.10] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.10em] text-bh-fg-2 sm:inline-flex">
            <Lock className="h-3 w-3 text-bh-success" />
            Pago seguro · SSL 256-bit
          </span>
          <Link
            href="mailto:soporte@ballershub.app"
            className="inline-flex items-center gap-1.5 rounded-bh-md border border-transparent px-2.5 py-1.5 text-[12px] font-semibold text-bh-fg-3 transition-colors duration-150 hover:text-bh-fg-1"
          >
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            Soporte
          </Link>
        </div>
      </div>
    </header>
  );
}
