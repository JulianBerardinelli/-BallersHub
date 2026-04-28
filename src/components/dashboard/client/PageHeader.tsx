import { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-3 border-b border-bh-fg-4/40 pb-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-[1.55] text-bh-fg-3">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
