import { Reveal, RevealItem, RevealStagger } from "./Reveal";

const FAQ = [
  {
    q: "¿Puedo probar antes de pagar?",
    a: "Sí. Todos los planes pagos incluyen 14 días de prueba sin compromiso y podés cancelar en cualquier momento desde tu panel.",
  },
  {
    q: "¿Cómo funciona la validación de mi perfil?",
    a: "Nuestro equipo verifica identidad, trayectoria y referencias antes de mostrar la insignia de perfil validado. El proceso normalmente toma 24–72 hs.",
  },
  {
    q: "¿Puedo cambiar de plan más adelante?",
    a: "Podés escalar o bajar de plan cuando quieras. Las diferencias se prorratean automáticamente en la próxima facturación.",
  },
  {
    q: "¿Hay un plan para clubes con varios usuarios?",
    a: "El plan Elite Scouting incluye accesos para staff. Si tu organización necesita configuraciones a medida, escribinos y armamos una propuesta.",
  },
];

export default function PricingFAQ() {
  return (
    <section className="relative">
      <Reveal className="mx-auto mb-10 max-w-xl text-center">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-bh-fg-3 backdrop-blur-md">
          Preguntas frecuentes
        </span>
        <h2 className="mt-4 font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Todo lo que necesitás <span className="text-bh-lime">saber</span>
        </h2>
      </Reveal>

      <RevealStagger
        className="mx-auto grid max-w-4xl gap-3 md:grid-cols-2"
        stagger={0.06}
        initialDelay={0.08}
      >
        {FAQ.map(({ q, a }) => (
          <RevealItem key={q}>
            <details className="group rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5 transition-colors duration-150 hover:border-white/[0.16] open:border-[rgba(204,255,0,0.25)] open:bg-[rgba(204,255,0,0.03)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-bh-fg-1 [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-bh-fg-3 transition-transform duration-200 group-open:rotate-45 group-open:border-[rgba(204,255,0,0.35)] group-open:text-bh-lime"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-[13px] leading-[1.6] text-bh-fg-3">{a}</p>
            </details>
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
