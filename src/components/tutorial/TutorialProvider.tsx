"use client";

// Lightweight context that wires the bootstrapped TutorialState into
// the dock + any future inline coachmarks. Bootstrap runs server-side
// (see `lib/tutorial/bootstrap.ts`); the provider just propagates.

import { createContext, useContext, type ReactNode } from "react";
import type { TutorialState } from "@/lib/tutorial/types";

const TutorialContext = createContext<TutorialState | null>(null);

export function TutorialProvider({
  state,
  children,
}: {
  state: TutorialState | null;
  children: ReactNode;
}) {
  return (
    <TutorialContext.Provider value={state}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialState | null {
  return useContext(TutorialContext);
}
