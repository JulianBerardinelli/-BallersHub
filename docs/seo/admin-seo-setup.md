# Setup del panel `/admin/seo` — Google Search Console integration

> **Audiencia**: owner / admin del sistema.
> **Tiempo**: ~30 min, una sola vez.
> **Resultado**: el panel `/admin/seo` empieza a mostrar datos reales de GSC.

El panel `/admin/seo` lee datos de Google Search Console vía la API oficial.
Para que funcione, hay que crear una Service Account de Google Cloud,
darle acceso a la propiedad de GSC, y guardar la clave JSON como env var
en Vercel.

Sin estas credenciales el panel no rompe: muestra un banner amarillo
indicando que la integración no está configurada.

---

## Paso 1 — Crear la Service Account en Google Cloud

1. Entrar a https://console.cloud.google.com con la cuenta que administra
   GSC (en nuestro caso, `julian.berardinelli@gmail.com`).
2. **Crear un proyecto** (o reutilizar uno). Sugerencia de nombre:
   `ballershub-seo`.
3. En el menú lateral → **APIs & Services → Library**:
   - Buscar **"Search Console API"** y habilitarla.
   - (Opcional, para iteración 2 GA4) buscar **"Google Analytics Data API"**
     y habilitarla también.
4. En el menú lateral → **IAM & Admin → Service Accounts**:
   - **Create Service Account**.
   - Service account name: `ballershub-seo-reader`.
   - Service account ID: se autocompleta → el email queda como
     `ballershub-seo-reader@<project>.iam.gserviceaccount.com`. **Anotalo.**
   - Role: no hace falta agregar uno en este paso → **Continue → Done**.
5. Click sobre la service account recién creada → pestaña **Keys** →
   **Add key → Create new key → JSON**. Se descarga un archivo `.json`.
   **Guardalo seguro** (es la credencial entera).

---

## Paso 2 — Dar acceso a Search Console

1. Abrir https://search.google.com/search-console y entrar a la
   propiedad `ballershub.co`.
2. **Settings → Users and permissions → Add user**.
3. Pegar el email de la service account
   (`ballershub-seo-reader@<project>.iam.gserviceaccount.com`).
4. Permission: **Restricted** alcanza (es read-only, perfecto para nosotros).
5. **Add**.

---

## Paso 3 — Setear env vars en Vercel

1. En https://vercel.com → tu proyecto → **Settings → Environment Variables**.
2. Agregar **dos** variables (en los environments Production y, opcional,
   Preview/Development):

### `GOOGLE_SERVICE_ACCOUNT_KEY`
El contenido **completo** del JSON que descargaste en el Paso 1.5, en una
**sola línea** (Vercel acepta JSON multilínea, pero por las dudas
stringificalo en una línea).

Tip: para evitar problemas con saltos de línea en el `private_key`, podés:
- Copiar el JSON tal cual (Vercel lo preserva).
- O reemplazar saltos de línea reales por `\n` literales antes de pegar
  (el código maneja ambos formatos).

### `GSC_SITE_URL`
La URL de la propiedad GSC verificada. En nuestro caso:
```
https://ballershub.co
```
(con o sin trailing slash; mientras matchee la propiedad verificada).

---

## Paso 4 — Redeploy y probar

1. Volver a hacer cualquier commit pequeño en main, o trigger un
   redeploy desde Vercel (Deployments → último → Redeploy) para que el
   código tome las env vars nuevas.
2. Entrar a https://ballershub.co/admin/seo logueado como admin.
3. Si todo está bien, vas a ver clicks/impressions/CTR/position de los
   últimos 28 días.
4. Si ves el banner amarillo de "Integración GSC no configurada",
   revisar:
   - Que la env var `GOOGLE_SERVICE_ACCOUNT_KEY` esté seteada en el
     environment correcto (Production si entrás a la URL real).
   - Que el `client_email` de la SA esté agregado en GSC con permisos.
   - Que la API de Search Console esté habilitada en el proyecto GCP.

---

## Troubleshooting

- **"Permission denied" / 403 al consultar la API**: típicamente significa
  que el email de la SA no está agregado en GSC, o que la propiedad
  `GSC_SITE_URL` no coincide exactamente con la verificada.
- **JSON parse error**: el contenido de `GOOGLE_SERVICE_ACCOUNT_KEY` no
  es JSON válido. Pegalo tal cual viene del .json descargado.
- **Datos vacíos / "GSC no tiene queries para mostrar"**: normal en las
  primeras 2-7 días después del setup. GSC tarda en empezar a poblar las
  Search Analytics. No es un error.
- **Quota exceeded**: GSC permite 1.200 queries/min/user y 50.000/día/property.
  Hoy el panel queda muy por debajo (las queries se cachean 1h).

---

## Qué NO hacer

- ❌ **No commitear** el archivo `.json` de la service account al repo.
  Va en Vercel env, nunca en git.
- ❌ **No usar las credenciales personales** de Google (OAuth user). La
  service account es la forma correcta para sistemas automáticos.
- ❌ **No dar permiso "Full"** en GSC a la service account. Restricted
  alcanza y limita el blast radius si la key se compromete.

---

## Iteración 2 (futuro): GA4

Cuando agreguemos GA4 al panel, vas a necesitar:
1. Habilitar **Google Analytics Data API** en el mismo proyecto GCP
   (paso 1.3.b, ya lo hiciste opcional).
2. En GA4 → Admin → Property → **Property Access Management** → agregar
   el email de la SA con role **Viewer**.
3. Env var nueva: `GA4_PROPERTY_ID` con el ID numérico de la property
   (lo encontrás en GA4 → Admin → Property Settings).

No es necesario hoy, solo cuando avancemos a iteración 2.
