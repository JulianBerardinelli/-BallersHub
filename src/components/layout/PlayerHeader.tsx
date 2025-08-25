import Link from "next/link";

export default function PlayerHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--heroui-colors-divider)] bg-[color:var(--heroui-colors-content1)]/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center px-4">
        <Link href="/(site)" className="text-sm font-semibold text-white">
          'BallersHub
        </Link>
      </div>
    </header>
  );
}
