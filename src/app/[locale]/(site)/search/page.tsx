type Props = { searchParams: { q?: string } };

export default function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q ?? "").trim();
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Resultados</h1>
      {q ? (
        <p className="text-sm text-neutral-400">Buscaste: “{q}”</p>
      ) : (
        <p className="text-sm text-neutral-400">Ingresá un término de búsqueda.</p>
      )}
      {/* Aquí después hacemos el fetch a Supabase/Drizzle con q */}
    </main>
  );
}
