import type { GalleryLayout, PhotoSlot } from "./types";

/**
 * 1/3-width tile (col-span-4 on desktop). Slight portrait so the column
 * doesn't feel squat; landscape photos crop modestly on the sides.
 */
const slotThird = (depth = 1): PhotoSlot => ({
  col: "col-span-12 md:col-span-4",
  aspect: "aspect-[4/5]",
  sizes: "(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 22vw",
  depth,
});

/**
 * 1/2-width tile (col-span-6 on desktop). Slight portrait works well for
 * both portrait selfies and landscape action shots, keeping rows uniform.
 */
const slotHalf = (depth = 1): PhotoSlot => ({
  col: "col-span-12 md:col-span-6",
  aspect: "aspect-[4/5]",
  sizes: "(max-width: 768px) 100vw, 33vw",
  depth,
});

/**
 * 1/2-width landscape tile. Used for the second row of the 5-block.
 */
const slotHalfLandscape = (depth = 0.7): PhotoSlot => ({
  col: "col-span-12 md:col-span-6",
  aspect: "aspect-[3/2]",
  sizes: "(max-width: 768px) 100vw, 33vw",
  depth,
});

/**
 * Full-width landscape tile. Forced 16/9 — a full-width portrait would
 * tower the page.
 */
const slotFull = (depth = 0.5): PhotoSlot => ({
  col: "col-span-12",
  aspect: "aspect-[16/9]",
  sizes: "(max-width: 768px) 100vw, 66vw",
  depth,
});

/**
 * Build a balanced grid for any photo count. Aspects are uniform within each
 * row so the grid never shows gaps when photos have different natural sizes.
 *
 * - 1   → single landscape hero
 * - 2   → 2-up half-width
 * - 3   → 3-up thirds
 * - 4   → 2x2 half-width (uniform aspect — no gaps with mixed orientations)
 * - 5   → 3 thirds + 2 landscape halves (canonical 3+2)
 * - 6   → 3x2 thirds
 * - 7+  → tiles the 5-block, then appends the small-count layout for the rest
 */
export function getGalleryLayout(count: number): GalleryLayout {
  switch (count) {
    case 0:
      return [];
    case 1:
      return [slotFull(0.5)];
    case 2:
      return [slotHalf(1.0), slotHalf(1.3)];
    case 3:
      return [slotThird(1.0), slotThird(1.4), slotThird(1.0)];
    case 4:
      return [slotHalf(1.0), slotHalf(1.3), slotHalf(0.8), slotHalf(1.1)];
    case 5:
      return [
        slotThird(1.0),
        slotThird(1.4),
        slotThird(1.0),
        slotHalfLandscape(0.6),
        slotHalfLandscape(0.9),
      ];
    case 6:
      return [
        slotThird(1.0),
        slotThird(1.4),
        slotThird(1.0),
        slotThird(0.7),
        slotThird(1.1),
        slotThird(0.7),
      ];
  }

  const FIVE_BLOCK = getGalleryLayout(5);
  const slots: GalleryLayout = [];
  let remaining = count;
  while (remaining > 6) {
    slots.push(...FIVE_BLOCK);
    remaining -= 5;
  }
  if (remaining > 0) {
    slots.push(...getGalleryLayout(remaining));
  }
  return slots;
}
