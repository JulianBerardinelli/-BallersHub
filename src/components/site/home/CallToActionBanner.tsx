import Link from "next/link";
import { ArrowRightCircle } from "lucide-react";

export default function CallToActionBanner() {
  return (
    <section className="relative overflow-hidden rounded-bh-xl border border-[rgba(204,255,0,0.18)] bg-bh-surface-1 p-8 md:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 90% at 0% 50%, rgba(204,255,0,0.10) 0%, transparent 70%), radial-gradient(ellipse 50% 80% at 100% 50%, rgba(0,194,255,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
            Próximo paso
          </span>
          <h2 className="font-bh-display text-3xl font-black uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            Prepará tu próxima <span className="text-bh-lime">transferencia</span>
          </h2>
          <p className="max-w-[520px] text-sm leading-[1.6] text-bh-fg-3">
            Organiza tus datos, compartí tu trayectoria y mantené actualizadas
            tus referencias con &apos;BallersHub.
          </p>
        </div>
        <Link
          href="/auth/sign-up"
          className="inline-flex shrink-0 items-center gap-2 rounded-bh-md bg-bh-lime px-6 py-3 text-sm font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          Crear cuenta gratuita
          <ArrowRightCircle className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
