// src/components/layout/SiteHeader.tsx
import HeaderChrome from "./HeaderChrome";
import AuthGate from "@/components/auth/AuthGate";
import SearchBar from "./searchbar";


export default async function SiteHeader() {
  return (
    <HeaderChrome
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
