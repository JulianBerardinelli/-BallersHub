// Reading-time estimate from HTML content.
//
// Strips tags, counts words, divides by an average reading pace.
// Used as the displayed "X min de lectura" chip and as Article schema
// wordCount derivation. Rounded up to nearest minute, min 1.

const WORDS_PER_MINUTE = 220;

export function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 1;
  const words = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function estimateWordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(" ").filter(Boolean).length;
}
