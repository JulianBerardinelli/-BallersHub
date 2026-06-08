import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware drop-in replacements for `next/link` + `next/navigation`.
//
// Use these everywhere internal navigation happens INSTEAD of next/link's
// <Link> and next/navigation's redirect/usePathname/useRouter. They keep
// the active locale in the URL and never hardcode a prefix — so a link to
// "/dashboard" resolves to "/dashboard" under es and "/en/dashboard"
// under en automatically.
//
// Phase 0d migrates the ~95 hardcoded redirect() calls + ~30 absolute
// <Link href> in src/components/layout/ to these.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
