// app/(public)/layout.tsx
import ZoomLock from "@/components/system/ZoomLock";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Las páginas públicas (CV de jugadores y agencias) deben ser 100% dueñas de la vista.
  // No deben compartir navbar genérico ni restricciones de max-width.
  return (
    <>
      {/* Bloquea el pinch-zoom en iOS (que ignora el viewport meta). El zoom
          horizontal/vertical de página ya está atajado por overflow-x: clip y
          touch-action en globals.css. */}
      <ZoomLock />
      {children}
    </>
  );
}
