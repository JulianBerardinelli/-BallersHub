// app/page.tsx

import AuthGate from "@/components/auth/AuthGate";




export default async function Home() {
  return (
    <main className="mx-auto max-w-6xl p-8 space-y-8">
      {/* Header con Auth */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">&apos;BallersHub</h1>
        <AuthGate/>
      </header>

      {/* Hero / contenido landing */}
      <section>
        <p className="mt-4 text-neutral-600">
          Perfiles profesionales de futbolistas con reseñas verificadas.
        </p>
      </section>
      

    </main>
  );
}
