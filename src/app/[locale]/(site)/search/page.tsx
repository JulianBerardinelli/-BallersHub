import { getTranslations } from "next-intl/server";

type Props = { searchParams: { q?: string } };

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();
  const t = await getTranslations("site.search");
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {q ? (
        <p className="text-sm text-neutral-400">{t("searched", { q })}</p>
      ) : (
        <p className="text-sm text-neutral-400">{t("prompt")}</p>
      )}
      {/* Aquí después hacemos el fetch a Supabase/Drizzle con q */}
    </main>
  );
}
