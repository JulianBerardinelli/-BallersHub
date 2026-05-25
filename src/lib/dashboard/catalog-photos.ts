/**
 * Define qué cuenta como "foto del catálogo" — la unidad que cuenta
 * contra `PRO_PHOTO_CAP` y la que se muestra en la galería pública.
 *
 * Exclusiones:
 * - Pro assets (heroUrl, modelUrl1/2): `provider` empieza con `pro_asset_`.
 * - Avatar: coincide la `url` con el `avatar_url` del player.
 *
 * Igualamos el filtro al de `MediaGalleryModule` para que dashboard y
 * portfolio público estén siempre alineados (n/5 en dashboard = lo que ve
 * el visitante).
 */
type CatalogPhotoCandidate = {
  type: string | null;
  provider: string | null;
  url: string;
};

export function isCatalogPhoto(
  media: CatalogPhotoCandidate,
  avatarUrl: string | null,
): boolean {
  if (media.type !== "photo") return false;
  if (media.provider && media.provider.startsWith("pro_asset_")) return false;
  if (avatarUrl && media.url === avatarUrl) return false;
  return true;
}
