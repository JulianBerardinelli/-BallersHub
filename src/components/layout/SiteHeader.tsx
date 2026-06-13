// src/components/layout/SiteHeader.tsx
import HeaderChrome from "./HeaderChrome";
import AuthGate from "@/components/auth/AuthGate";
import SearchBar from "./searchbar";
import { getSiteNavSession } from "./site-nav-session";


export default async function SiteHeader() {
  // Request-cached (shared with AuthGate + the dock) — no extra DB round-trip.
  const session = await getSiteNavSession();
  return (
    <HeaderChrome
      isAuthed={!!session}
      authSlot={
        <>
          <SearchBar />
          {/* On mobile the account UI lives in the floating dock (Acceder /
              avatar), so hide the header auth cluster below md to avoid
              duplication. Search + locale stay. */}
          <div className="hidden items-center md:flex">
            <AuthGate />
          </div>
        </>
      }
    />
  );
}
