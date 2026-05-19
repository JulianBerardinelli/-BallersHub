import Link from "next/link";
import { ArrowRight, Hourglass } from "lucide-react";
import CheckoutStepper from "@/components/site/checkout/CheckoutStepper";

export const metadata = {
  title: "Pago en proceso · 'BallersHub",
  robots: { index: false, follow: false },
};

export default function CheckoutPendingPage() {
  return (
    <div className="space-y-10">
      <CheckoutStepper current="confirmation" />

      <section className="mx-auto max-w-xl space-y-7 py-4 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-bh-warning/30 bg-bh-warning/10 text-bh-warning">
          <Hourglass className="h-7 w-7" />
        </span>

        <div className="space-y-3">
          <h1 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            Estamos procesando tu pago
          </h1>
          <p className="text-[14px] leading-[1.6] text-bh-fg-2">
            Algunos métodos (efectivo, transferencia, débito en Argentina)
            tardan unos minutos en confirmarse. Te vamos a mandar un email
            apenas se acredite — no hace falta que hagas nada más.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
          >
            Ir a mi dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.12] px-6 py-3 text-[13px] font-semibold text-bh-fg-2 transition-colors duration-150 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </div>
  );
}
