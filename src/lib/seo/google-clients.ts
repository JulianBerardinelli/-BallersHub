// Google service-account auth + clientes para Search Console.
//
// Setup (Capa 1, hace el owner una sola vez):
//   1. GCP Console → crear proyecto (o usar uno existente).
//   2. Habilitar "Search Console API" y "Google Analytics Data API".
//   3. IAM → Service Accounts → crear una. Guardar el JSON key.
//   4. Search Console → settings de la propiedad → Users and permissions
//      → agregar el `client_email` de la service account con permisos
//      `Full` o `Restricted` (`Restricted` alcanza para read-only).
//   5. Vercel env vars:
//      - GOOGLE_SERVICE_ACCOUNT_KEY = el JSON completo, stringificado en
//        una sola línea (lo que está dentro del archivo .json).
//      - GSC_SITE_URL = "https://ballershub.co" (con o sin trailing slash;
//        debe matchear la propiedad verificada en Search Console).
//
// Si las env vars no están, las queries devuelven `null` o un error de
// configuración — la UI maneja ese estado sin romper.

import { google } from "googleapis";
import { JWT } from "google-auth-library";

let _jwtClient: JWT | null = null;

export class GoogleApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleApiConfigError";
  }
}

/**
 * Lazy-init JWT client desde la env var. Se reutiliza entre invocaciones
 * en la misma function instance (Fluid Compute reuse).
 */
function getServiceAccountJwt(): JWT {
  if (_jwtClient) return _jwtClient;

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    throw new GoogleApiConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY no está configurada. Ver docs/seo/admin-seo-setup.md.",
    );
  }

  let credentials: { client_email?: string; private_key?: string };
  try {
    credentials = JSON.parse(keyJson);
  } catch {
    throw new GoogleApiConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY no es JSON válido. Pegarlo stringificado en una sola línea.",
    );
  }

  const { client_email, private_key } = credentials;
  if (!client_email || !private_key) {
    throw new GoogleApiConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY incompleta — faltan `client_email` o `private_key`.",
    );
  }

  _jwtClient = new JWT({
    email: client_email,
    // El private_key viene con `\n` escapados cuando se pega en una env var;
    // Vercel los preserva, pero por las dudas también soportamos el caso.
    key: private_key.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      // GA4 Data API (read) for the /admin/seo/funnel panel (iter-2). The SA
      // has both GSC + GA4 access, so one JWT covers both APIs.
      "https://www.googleapis.com/auth/analytics.readonly",
    ],
  });

  return _jwtClient;
}

/**
 * Returns la URL canónica de la propiedad GSC. Lee de env var con fallback
 * a la URL de prod conocida (ballershub.co).
 */
export function getGscSiteUrl(): string {
  return process.env.GSC_SITE_URL ?? "https://ballershub.co";
}

/**
 * Cliente Search Console listo para usar.
 */
export function getSearchConsoleClient() {
  const auth = getServiceAccountJwt();
  return google.searchconsole({ version: "v1", auth });
}

/**
 * GA4 Data API client (read-only). Reuses the same service-account JWT as
 * GSC (one JWT, both scopes). Requires the SA added as a Viewer on the GA4
 * property + the "Google Analytics Data API" enabled in the GCP project.
 */
export function getAnalyticsDataClient() {
  const auth = getServiceAccountJwt();
  return google.analyticsdata({ version: "v1beta", auth });
}

/**
 * GA4 property in `properties/123456789` form (also accepts a bare numeric
 * id). Throws GoogleApiConfigError when GA4_PROPERTY_ID isn't set so the
 * funnel panel degrades gracefully instead of crashing the tree.
 */
export function getGa4Property(): string {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) {
    throw new GoogleApiConfigError(
      "GA4_PROPERTY_ID no está configurada. Ver docs/seo/admin-seo-setup.md (sección GA4).",
    );
  }
  return id.startsWith("properties/") ? id : `properties/${id}`;
}

/**
 * Helper para chequear desde UI/RSC si la integración está configurada.
 * Devuelve `{ ok: true }` si está OK o `{ ok: false, reason }` si no.
 * No throwea — la UI usa esto para mostrar un estado "setup pending".
 */
export function getGoogleApiStatus(): { ok: true } | { ok: false; reason: string } {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    return { ok: false, reason: "GOOGLE_SERVICE_ACCOUNT_KEY no configurada" };
  }
  if (!process.env.GSC_SITE_URL) {
    // No-fatal: tenemos fallback a ballershub.co, pero avisamos.
    return { ok: true };
  }
  return { ok: true };
}
