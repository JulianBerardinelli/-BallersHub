export type Orientation = "portrait" | "landscape" | "square";

const ORIENTATION_TOLERANCE = 1.05;

/**
 * Preload an image and resolve its natural orientation.
 * Falls back to "landscape" on error or in non-browser environments
 * (the most common shape in a sports portfolio).
 */
export function detectOrientation(url: string): Promise<Orientation> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve("landscape");
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w > 0 && h > 0) {
        if (h > w * ORIENTATION_TOLERANCE) resolve("portrait");
        else if (w > h * ORIENTATION_TOLERANCE) resolve("landscape");
        else resolve("square");
      } else {
        resolve("landscape");
      }
    };
    img.onerror = () => resolve("landscape");
    img.src = url;
  });
}

/**
 * Sort priority used to assign photos to slots: portraits first (they fill
 * the portrait-shaped top-row slots), then squares (neutral), then
 * landscapes (they fill the landscape bottom-row slots).
 */
export const ORIENTATION_PRIORITY: Record<Orientation, number> = {
  portrait: 0,
  square: 1,
  landscape: 2,
};
