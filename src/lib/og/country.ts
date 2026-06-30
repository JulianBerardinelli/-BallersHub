// Locale-aware country name for the OG cards.
//
//   • es → the site's canonical Spanish naming (`countryName`, COUNTRY_NAME_ES)
//     so the card matches the rest of the product.
//   • en → `Intl.DisplayNames` (covers every ISO-2 code, no hardcoded map),
//     with a couple of football-convention overrides (GB → England).
//
// Falls back to the ES name if the EN lookup fails for any reason.

import { countryName } from "@/lib/scouting/taxonomies";

const EN_OVERRIDES: Record<string, string> = {
  GB: "England", // football convention (the site treats GB as England)
};

let enNames: Intl.DisplayNames | null = null;
function enRegion(): Intl.DisplayNames {
  if (!enNames) enNames = new Intl.DisplayNames(["en"], { type: "region" });
  return enNames;
}

export function ogCountryName(alpha2: string | null, lang: "es" | "en"): string {
  if (!alpha2) return "";
  const code = alpha2.toUpperCase();
  if (lang === "es") return countryName(code);
  if (EN_OVERRIDES[code]) return EN_OVERRIDES[code];
  try {
    return enRegion().of(code) ?? countryName(code);
  } catch {
    return countryName(code);
  }
}
