// Comments section — placeholder ("Próximamente"). The design includes a
// comments block, but there's no comments backend yet, so we reserve the
// space with a clearly disabled state instead of shipping a form that loses
// data on reload.

export function CommentsPlaceholder() {
  return (
    <section aria-labelledby="comentarios-heading">
      <h2
        id="comentarios-heading"
        className="mb-5 font-bh-display text-[26px] font-bold uppercase text-bh-fg-1"
      >
        Comentarios
      </h2>
      <div className="flex flex-col items-center gap-2 rounded-bh-lg border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-10 text-center">
        <span className="rounded-bh-pill border border-bh-lime/30 bg-bh-lime/10 px-2.5 py-1 font-bh-mono text-[10px] uppercase tracking-[0.12em] text-bh-lime">
          Próximamente
        </span>
        <p className="m-0 max-w-sm font-bh-body text-sm leading-[1.55] text-bh-fg-3">
          Estamos preparando los comentarios para que puedas sumar tu mirada a cada nota.
          Mientras tanto, compartila y seguí la conversación en nuestras redes.
        </p>
      </div>
    </section>
  );
}
