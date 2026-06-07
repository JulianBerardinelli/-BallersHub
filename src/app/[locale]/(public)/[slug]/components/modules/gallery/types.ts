export type GalleryPhoto = {
  id: string;
  url: string;
  title?: string | null;
  altText?: string | null;
};

/**
 * Layout slot for a single photo inside the 12-col gallery grid.
 *
 * Slots use a *uniform* aspect ratio per row so a mixed-orientation album
 * never opens holes in the grid. Photos are cropped to fit (object-cover);
 * the lightbox shows the original uncropped on click.
 */
export type PhotoSlot = {
  /** Tailwind classes that define the col-span at each breakpoint. */
  col: string;
  /** Tailwind aspect-ratio class. Stable across all photos in this slot type. */
  aspect: string;
  /** Browser hint for responsive image fetching. */
  sizes: string;
  /** Multiplier for the entry parallax (0 = none, 1 = standard). */
  depth: number;
};

export type GalleryLayout = PhotoSlot[];
