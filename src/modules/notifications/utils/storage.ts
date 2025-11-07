const DISMISSED_KEY = "ballershub.notifications.dismissed";

export const loadDismissed = (): Set<string> => {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch (error) {
    console.warn("[notifications] No se pudo leer el estado de descartados", error);
    return new Set();
  }
};

export const persistDismissed = (ids: Set<string>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch (error) {
    console.warn("[notifications] No se pudo guardar el estado de descartados", error);
  }
};

export const resetDismissedStorage = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(DISMISSED_KEY);
};
