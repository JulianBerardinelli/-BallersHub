// app/(public)/layout.tsx

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Las páginas públicas (CV de jugadores y agencias) deben ser 100% dueñas de la vista.
  // No deben compartir navbar genérico ni restricciones de max-width.
  return <>{children}</>;
}
