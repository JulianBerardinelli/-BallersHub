// src/components/layout/SiteHeader.tsx
import HeaderChrome from "./HeaderChrome";
import AuthGate from "@/components/auth/AuthGate";
import SearchBar from "./searchbar";


export default async function SiteHeader() {
  const authSlot = <AuthGate />;
  return (
    <HeaderChrome
      authSlot={
        <>
          <SearchBar />
          {authSlot}
        </>
      }
    />
  );
}
