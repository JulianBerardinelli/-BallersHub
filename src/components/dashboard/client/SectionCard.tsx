import { ReactNode } from "react";

export default function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-6 shadow-sm shadow-black/20">
      {(title || description) && (
        <div className="mb-4 space-y-1">
          {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
          {description ? <p className="text-sm text-neutral-400">{description}</p> : null}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {footer ? <div className="mt-6 border-t border-neutral-900 pt-4 text-sm text-neutral-400">{footer}</div> : null}
    </section>
  );
}
