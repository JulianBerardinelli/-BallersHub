import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { verifyUnsubscribeToken } from "@/lib/marketing/unsubscribe-token";
import { suppress } from "@/lib/marketing/suppression";
import UnsubscribeView from "./UnsubscribeView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("site.unsubscribe");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}

type Search = Promise<{ token?: string }>;

/**
 * Public unsubscribe landing.
 *
 * Visiting this page with a valid token IMMEDIATELY suppresses the
 * email (no extra confirmation click). This is intentional — if the
 * user clicked the link they want out, and forcing a second click is
 * the #1 reason marked-as-spam complaints rise.
 *
 * The page also accepts no token (footer link clicked from a forwarded
 * email) and renders a manual lookup form, but suppression in that
 * case is rate-limited by the API.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Search }) {
  const { token } = await searchParams;

  if (!token) {
    return <UnsubscribeView state={{ kind: "no_token" }} />;
  }

  try {
    const { email } = verifyUnsubscribeToken(token);
    await suppress(email, "user_request");
    return <UnsubscribeView state={{ kind: "success", email }} />;
  } catch (e) {
    const t = await getTranslations("site.unsubscribe.error");
    return (
      <UnsubscribeView
        state={{
          kind: "error",
          message:
            e instanceof Error && e.message ? e.message : t("defaultMessage"),
        }}
      />
    );
  }
}
