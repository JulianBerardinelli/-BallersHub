"use client";

// Shared state for the pricing page: audience (player ↔ agency) and
// currency (USD / ARS / EUR). Both are user-toggleable on the page.
//
// Persistence:
// - audience → sessionStorage (resets between visits unless deep-linked)
// - currency → localStorage (sticks across visits, since users tend to
//   stay in their currency)
//
// Default values come from props. The page can pass server-detected
// geo-IP defaults later; right now we use static defaults.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Audience, Currency } from "./data";

type PricingState = {
  audience: Audience;
  currency: Currency;
  setAudience: (a: Audience) => void;
  setCurrency: (c: Currency) => void;
};

const PricingContext = createContext<PricingState | null>(null);

const SESSION_KEY = "bh.pricing.audience";
const LOCAL_KEY = "bh.pricing.currency";

const ALL_AUDIENCES: readonly Audience[] = ["player", "agency"] as const;
const ALL_CURRENCIES: readonly Currency[] = ["USD", "ARS", "EUR"] as const;

export function PricingProvider({
  initialAudience = "player",
  initialCurrency = "USD",
  children,
}: {
  initialAudience?: Audience;
  initialCurrency?: Currency;
  children: ReactNode;
}) {
  const [audience, setAudience] = useState<Audience>(initialAudience);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);

  // Track hydration so we don't overwrite stored values with the SSR defaults.
  const hydratedRef = useRef(false);

  // Hydrate from storage on first client mount.
  useEffect(() => {
    try {
      const a = sessionStorage.getItem(SESSION_KEY);
      if (a && (ALL_AUDIENCES as readonly string[]).includes(a)) {
        setAudience(a as Audience);
      }
      const c = localStorage.getItem(LOCAL_KEY);
      if (c && (ALL_CURRENCIES as readonly string[]).includes(c)) {
        setCurrency(c as Currency);
      }
    } catch {
      // storage may be disabled (private mode) — ignore, keep defaults
    }
    hydratedRef.current = true;
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      sessionStorage.setItem(SESSION_KEY, audience);
    } catch {}
  }, [audience]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(LOCAL_KEY, currency);
    } catch {}
  }, [currency]);

  return (
    <PricingContext.Provider
      value={{ audience, currency, setAudience, setCurrency }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing(): PricingState {
  const ctx = useContext(PricingContext);
  if (!ctx) {
    throw new Error("usePricing must be used inside <PricingProvider>");
  }
  return ctx;
}
