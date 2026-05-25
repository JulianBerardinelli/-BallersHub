/**
 * Cuentas fundadoras exentas del cap de fotos del catálogo.
 *
 * Los 3 emails listados acá pueden subir cualquier cantidad de fotos
 * al catálogo de multimedia; el resto de cuentas Pro tienen `PRO_PHOTO_CAP`.
 * Free no puede subir fotos (gate aparte).
 *
 * Hardcodeado a propósito: lista corta, estática, y queremos que cualquier
 * cambio pase por PR. Si en el futuro el set crece o necesita TTL, migrar
 * a una tabla `founder_users` o a un flag en `user_profiles`.
 */
export const FOUNDER_EMAILS = new Set<string>([
  "julian.berardinelli@gmail.com",
  "sarrafelipemartin@gmail.com",
  "fede.sarra7@gmail.com",
]);

/**
 * Tope de fotos del catálogo para Pro non-founder.
 * Coincide con la galería pública (MediaGalleryModule limita a 5 también).
 * No incluye avatar ni pro_assets — solo fotos curadas del catálogo.
 */
export const PRO_PHOTO_CAP = 5;

export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return FOUNDER_EMAILS.has(email.toLowerCase());
}
