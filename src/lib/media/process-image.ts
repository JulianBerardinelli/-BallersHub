// Image processing shared by the admin media upload route. Mirrors the
// player-facing /api/media/upload behavior (AVIF transcode + default alt-text)
// so admin-uploaded catalog photos are stored identically.

import sharp from "sharp";

export const ACCEPTED_IMAGE_MIME = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const AVIF_QUALITY = 60;

/** Synthesize alt-text from the player's identity when none is supplied. */
export function buildDefaultAltText(profile: {
  full_name: string | null;
  positions: string[] | null;
  current_club: string | null;
}): string {
  const name = profile.full_name?.trim() || "Futbolista";
  const segments: string[] = [name];
  if (profile.positions && profile.positions.length > 0) {
    segments.push(profile.positions.slice(0, 2).join(" / "));
  }
  if (profile.current_club && profile.current_club.trim().length > 0) {
    segments.push(profile.current_club.trim());
  }
  return segments.join(" — ");
}

/** Transcode an uploaded image File to AVIF (AVIF input passes through). */
export async function transcodeImageToAvif(
  file: File,
): Promise<{ buffer: Buffer; contentType: string } | { error: string }> {
  const mimeType = file.type.toLowerCase();
  if (!ACCEPTED_IMAGE_MIME.has(mimeType)) {
    return { error: "Formato no soportado. Subí JPG, PNG, WebP o AVIF." };
  }
  if (mimeType === "image/avif") {
    return { buffer: Buffer.from(await file.arrayBuffer()), contentType: "image/avif" };
  }
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const buffer = await sharp(input)
      .rotate()
      .avif({ quality: AVIF_QUALITY, effort: 4 })
      .toBuffer();
    return { buffer, contentType: "image/avif" };
  } catch (err) {
    console.error("AVIF transcode error:", err);
    return { error: "No se pudo procesar la imagen. Probá con otro archivo." };
  }
}
