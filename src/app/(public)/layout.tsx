// app/(public)/layout.tsx
import PlayerHeader from "@/components/layout/PlayerHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PlayerHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </>
  );
}
