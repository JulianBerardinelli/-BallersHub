// Post-process the sanitized TipTap content HTML for the redesigned
// article page:
//   1. Inject stable `id` anchors into <h2>/<h3> (so the TOC + scroll-spy +
//      in-page links work — TipTap output has no ids).
//   2. Extract the heading outline for the sticky table of contents.
//
// We operate on the already-sanitized `content_html` (produced server-side
// by the editor pipeline), so a focused regex pass is sufficient and avoids
// pulling a DOM parser into the request path.

export type TocHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64)
    .replace(/^-|-$/g, "");
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Inject ids into h2/h3 headings and return the heading outline.
 * Existing ids are preserved as-is; generated ids are de-duplicated.
 */
export function processArticleHtml(html: string): {
  html: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const used = new Set<string>();

  const out = html.replace(
    /<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag: string, attrs: string, inner: string) => {
      const text = decodeBasicEntities(inner.replace(/<[^>]+>/g, "")).trim();
      if (!text) return match;

      const existing = attrs.match(/\sid=["']([^"']+)["']/i);
      let id: string;
      if (existing) {
        id = existing[1];
        used.add(id);
      } else {
        const base = slugify(text) || "seccion";
        id = base;
        let n = 2;
        while (used.has(id)) id = `${base}-${n++}`;
        used.add(id);
      }

      const level: 2 | 3 = tag.toLowerCase() === "h2" ? 2 : 3;
      headings.push({ id, text, level });

      // Already had an id → leave the markup untouched.
      if (existing) return match;
      return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html: out, headings };
}
