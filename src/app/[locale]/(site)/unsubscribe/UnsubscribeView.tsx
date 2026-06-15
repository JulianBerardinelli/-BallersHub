import Link from "next/link";
import { CheckCircle2, MailX, Inbox } from "lucide-react";
import { getTranslations } from "next-intl/server";

type State =
  | { kind: "success"; email: string }
  | { kind: "error"; message: string }
  | { kind: "no_token" };

const SUPPORT_EMAIL = "info@ballershub.co";

/**
 * Read-only result view rendered after the unsubscribe page processes
 * the token server-side. Uses the dashboard design tokens (bh-*) so
 * the public confirmation feels in-brand.
 */
export default async function UnsubscribeView({ state }: { state: State }) {
  const t = await getTranslations("site.unsubscribe");

  if (state.kind === "success") {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-bh-lime/10 text-bh-lime">
            <CheckCircle2 className="size-6" aria-hidden />
          </div>
          <h1 className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-1">
            {t("success.title")}
          </h1>
          <p className="mt-3 text-sm leading-[1.6] text-bh-fg-2">
            {t("success.intro")}
            <span className="font-semibold text-bh-fg-1">{state.email}</span>.
          </p>
          <p className="mt-2 text-[12px] leading-[1.6] text-bh-fg-3">
            {t("success.fallback")}
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-bh-md border border-white/[0.18] px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors hover:border-white/[0.32] hover:bg-white/[0.06] hover:text-bh-fg-1"
            >
              {t("success.back")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-xl py-16">
        <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-bh-danger/10 text-bh-danger">
            <MailX className="size-6" aria-hidden />
          </div>
          <h1 className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-1">
            {t("error.title")}
          </h1>
          <p className="mt-3 text-sm leading-[1.6] text-bh-fg-2">{state.message}</p>
          <p className="mt-2 text-[12px] leading-[1.6] text-bh-fg-3">
            {t.rich("error.contact", {
              email: (chunks) => (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-bh-lime underline-offset-2 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    );
  }

  // no_token
  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-8 text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-white/[0.06] text-bh-fg-2">
          <Inbox className="size-6" aria-hidden />
        </div>
        <h1 className="font-bh-display text-2xl font-bold uppercase tracking-tight text-bh-fg-1">
          {t("noToken.title")}
        </h1>
        <p className="mt-3 text-sm leading-[1.6] text-bh-fg-2">
          {t("noToken.description")}
        </p>
        <p className="mt-2 text-[12px] leading-[1.6] text-bh-fg-3">
          {t.rich("noToken.contact", {
            email: (chunks) => (
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-bh-lime underline-offset-2 hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
