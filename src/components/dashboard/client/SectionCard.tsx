import { ReactNode } from "react";

export default function SectionCard({
  title,
  description,
  children,
  footer,
  actions,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="bh-card-lift rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
      {(title || description || actions) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            {title ? (
              <h2 className="font-bh-display text-xl font-bold uppercase leading-[1.1] tracking-[-0.005em] text-bh-fg-1">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm leading-[1.55] text-bh-fg-3">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2 sm:pt-1">{actions}</div> : null}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {footer ? (
        <div className="mt-6 border-t border-white/[0.06] pt-4 text-sm text-bh-fg-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
