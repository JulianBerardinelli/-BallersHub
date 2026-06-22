export type NormalizedAgencyService = {
  title: string;
  icon: string;
  color: string | null;
  description: string | null;
};

/**
 * Normalize the `agency_profiles.services` JSONB into the rich object shape the
 * editors expect. Pre-existing rows or partially migrated payloads might arrive
 * as raw strings or partial objects — coerce them before crossing the
 * server/client boundary. Used by both the Services and Translations routes.
 */
export function normalizeAgencyServices(raw: unknown[]): NormalizedAgencyService[] {
  return raw.map((s) => {
    if (typeof s === "string") {
      return { title: s, icon: "briefcase", color: null, description: null };
    }
    if (s && typeof s === "object") {
      const obj = s as Record<string, unknown>;
      return {
        title: typeof obj.title === "string" ? obj.title : "",
        icon: typeof obj.icon === "string" && obj.icon ? obj.icon : "briefcase",
        color: typeof obj.color === "string" ? obj.color : null,
        description: typeof obj.description === "string" ? obj.description : null,
      };
    }
    return { title: "", icon: "briefcase", color: null, description: null };
  });
}
