"use client";

// Resolves the current viewer's user id once per page load and shares the
// answer across every owner-gated island on the Free portfolio.
//
// The public `/[slug]` page is ISR-cached (revalidate = 3600) and served
// byte-identical to everyone — crawlers, anonymous fans, scouts and the owner
// alike. We therefore can't know who the viewer is server-side without killing
// the cache, so we resolve identity client-side instead (same trade-off the
// floating OwnerProUpgradeNudge already makes).
//
// Perf guard: anonymous visitors (no supabase session) are the overwhelming
// majority of portfolio views, and for them we never import the supabase
// client at all — the synchronous session probe short-circuits before the
// dynamic import, so the auth JS chunk is only fetched for logged-in viewers
// (who might be the owner). The result promise is memoised at module scope so
// the three Pro slots share a single getUser() call.

import { useEffect, useState } from "react";

let viewerIdPromise: Promise<string | null> | null = null;

// supabase-js stores the session under the key `sb-<project-ref>-auth-token`,
// chunked into `.0`, `.1`, … suffixes when the JWT is large.
const AUTH_TOKEN_KEY = /^sb-.+-auth-token(\.\d+)?$/;

/**
 * Cheap, synchronous "is anyone logged in?" probe so anonymous visitors never
 * pull the supabase chunk. This app wires @supabase/ssr's createBrowserClient
 * with the default (cookie) storage — and our auth cookies are not HttpOnly —
 * so the session lives in JS-readable `sb-…-auth-token` cookies. We check those
 * first, then fall back to localStorage in case a flow ever stores it there.
 * False is only safe to act on when BOTH are empty (→ definitely anonymous).
 */
function hasSupabaseSession(): boolean {
  try {
    if (typeof document !== "undefined" && document.cookie) {
      const hasAuthCookie = document.cookie
        .split(";")
        .some((entry) => AUTH_TOKEN_KEY.test((entry.split("=")[0] ?? "").trim()));
      if (hasAuthCookie) return true;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      const storage = window.localStorage;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && AUTH_TOKEN_KEY.test(key)) return true;
      }
    }
  } catch {
    // Cookies/localStorage blocked (private mode, sandboxed iframe) → anonymous.
  }
  return false;
}

/**
 * Returns the viewer's user id, or null when anonymous / unresolved. Memoised
 * for the lifetime of the page so repeated callers don't re-run the auth check.
 */
export function resolveViewerId(): Promise<string | null> {
  if (viewerIdPromise) return viewerIdPromise;
  viewerIdPromise = (async () => {
    if (typeof window === "undefined") return null;
    if (!hasSupabaseSession()) return null;
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    } catch {
      // Network/refresh failure → treat as anonymous, keep showing the ad.
      return null;
    }
  })();
  return viewerIdPromise;
}

/**
 * True only once the viewer is confirmed to be the profile owner. Starts false
 * (matching the SSR / first-paint render so there is no hydration mismatch) and
 * flips to true asynchronously when ownership is confirmed. For anonymous
 * visitors and other logged-in users it stays false forever.
 */
export function useViewerIsOwner(ownerUserId: string | null): boolean {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!ownerUserId) return;
    let cancelled = false;
    resolveViewerId().then((viewerId) => {
      if (!cancelled && viewerId && viewerId === ownerUserId) {
        setIsOwner(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ownerUserId]);

  return isOwner;
}
