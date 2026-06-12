import { LOCALE_FLAG } from "@/i18n/config";
import type { Locale } from "@/i18n/routing";

/**
 * Flag icon for a locale, used in the language pickers (LocaleSwitcher +
 * the logged-in UserMenu). Renders the `flag-icons` CSS sprite
 * (`fi fi-<code>`, already imported globally in styles/globals.css), sized
 * via font-size so it scales cleanly next to text.
 *
 * Decorative by default (`aria-hidden`): the adjacent language name is the
 * accessible label, so the flag is never read twice by a screen reader.
 */
export function LocaleFlag({
  locale,
  size = 16,
  className = "",
}: {
  locale: Locale;
  /** Height in px (flag-icons keeps the 4:3 ratio). */
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`fi fi-${LOCALE_FLAG[locale]} inline-block shrink-0 rounded-[2px] ${className}`}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
      aria-hidden
    />
  );
}
