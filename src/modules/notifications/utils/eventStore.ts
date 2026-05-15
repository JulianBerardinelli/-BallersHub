const EVENTS_KEY = "ballershub.notifications.events";

let cachedEvents: Set<string> | null = null;

const loadEvents = (): Set<string> => {
  if (typeof window === "undefined") {
    return new Set();
  }

  if (cachedEvents) {
    return cachedEvents;
  }

  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (!raw) {
      cachedEvents = new Set();
      return cachedEvents;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedEvents = new Set();
      return cachedEvents;
    }

    const normalized = parsed.filter((value): value is string => typeof value === "string");
    cachedEvents = new Set(normalized);
    return cachedEvents;
  } catch (error) {
    console.warn("[notifications] No se pudo leer el registro de eventos", error);
    cachedEvents = new Set();
    return cachedEvents;
  }
};

const persistEvents = (events: Set<string>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(Array.from(events)));
  } catch (error) {
    console.warn("[notifications] No se pudo guardar el registro de eventos", error);
  }
};

/**
 * Marca un evento como entregado. Devuelve `true` sólo si el evento no había
 * sido registrado previamente.
 */
export const ensureEventRecorded = (eventId: string | null | undefined): boolean => {
  if (!eventId) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const events = loadEvents();
  if (events.has(eventId)) {
    return false;
  }

  events.add(eventId);
  cachedEvents = events;
  persistEvents(events);
  return true;
};

export const resetRecordedEvents = () => {
  if (typeof window === "undefined") {
    return;
  }
  cachedEvents = new Set();
  window.localStorage.removeItem(EVENTS_KEY);
};
