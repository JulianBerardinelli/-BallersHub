// Shared static OG fallback for pages that set their own `openGraph` block
// without an image AND have no sibling `opengraph-image` file.
//
// Why this exists: in Next 15 a child segment that returns an `openGraph`
// object REPLACES the inherited one (see resolve-metadata.js `mergeMetadata`),
// so the `[locale]/opengraph-image.tsx` card is dropped for those routes and
// they would emit NO og:image (scrapers then grab a page <img>). Spreading
// this `images` array into their `openGraph` restores a branded preview.
// `twitter.images` is auto-inherited from `openGraph.images` by Next, so it
// doesn't need to be set separately.
//
// `og-default.png` is the home card, pre-rendered to /public. Regenerate it if
// the brand changes (render `HomeCard` → public/og-default.png).

export const OG_FALLBACK_IMAGE = {
  url: "/og-default.png",
  width: 1200,
  height: 630,
  alt: "'BallersHub — El hub del fútbol profesional",
} as const;

/** Spread into a page's `openGraph` to guarantee a branded preview image. */
export const ogFallbackImages = [OG_FALLBACK_IMAGE];
