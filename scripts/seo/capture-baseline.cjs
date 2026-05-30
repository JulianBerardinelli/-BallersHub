#!/usr/bin/env node
// Captura snapshot del state SEO de las URLs críticas de 'BallersHub.
// Genera docs/seo/drift/baseline-<fecha>.json y actualiza el symlink
// docs/seo/drift/baseline.json al más reciente.
//
// Uso:
//   node scripts/seo/capture-baseline.cjs
//   node scripts/seo/capture-baseline.cjs --out docs/seo/drift/snapshot.json
//   node scripts/seo/capture-baseline.cjs --base https://ballershub.co
//
// Sin dependencias externas: usa node fetch + parser de meta/jsonld con
// regex simples (es defensivo, no perfecto — para SEO drift basta).

const fs = require("fs");
const path = require("path");

const BASE = (process.argv.find((a, i) => process.argv[i - 1] === "--base") ||
  process.env.BH_BASE_URL || "https://ballershub.co").replace(/\/+$/, "");

const OUT = process.argv.find((a, i) => process.argv[i - 1] === "--out") ||
  path.join("docs/seo/drift", `baseline-${new Date().toISOString().slice(0, 10)}.json`);

// URLs críticas. Si una falla (404), igual la incluimos en el baseline
// como `{ status: 404 }` — sirve para detectar regresiones futuras.
const URLS = [
  "/",
  "/pricing",
  "/about",
  "/blog",
  "/blog/authors/julian-berardinelli",
  "/julian-berardinelli",
  "/federico-sarra",
  "/pedro-samso",
  "/felipe-sarra",
  "/mateo-germani",
  "/nicolas-locuoco",
  "/sitemap.xml",
  "/llms.txt",
  "/robots.txt",
];

// ---------- Parsers ----------

function extractMetaTag(html, attrName, attrValue) {
  const re = new RegExp(
    `<meta[^>]*\\b${attrName}=["']${attrValue}["'][^>]*\\bcontent=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];
  // Order swap
  const re2 = new RegExp(
    `<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b${attrName}=["']${attrValue}["']`,
    "i",
  );
  return html.match(re2)?.[1] ?? null;
}

function extractTitle(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function extractCanonical(html) {
  return html.match(/<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["']/i)?.[1]
    ?? null;
}

function extractJsonLdBlocks(html) {
  const out = [];
  const re = /<script type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1]);
      out.push(summarizeJsonLd(data));
    } catch (err) {
      out.push({ parseError: err.message?.slice(0, 100) ?? "parse error" });
    }
  }
  return out;
}

/** Resume un bloque JSON-LD a sus tipos + @id refs (lo que importa para drift). */
function summarizeJsonLd(data) {
  if (!data || typeof data !== "object") return { invalid: true };
  if (Array.isArray(data)) return data.map(summarizeJsonLd);
  if (data["@graph"] && Array.isArray(data["@graph"])) {
    return {
      "@context": data["@context"],
      "@graph": data["@graph"].map((n) => ({
        "@type": n["@type"],
        "@id": n["@id"],
        // Capturamos algunos campos clave por tipo (no todo el contenido):
        ...(n.name && { name: n.name }),
        ...(n.url && { url: n.url }),
        ...(n.sameAs && { sameAsCount: Array.isArray(n.sameAs) ? n.sameAs.length : 0 }),
        ...(n.offers && { offersCount: Array.isArray(n.offers) ? n.offers.length : 1 }),
        ...(n.itemListElement && {
          breadcrumbCount: Array.isArray(n.itemListElement) ? n.itemListElement.length : 0,
        }),
        ...(n.image && { hasImage: true }),
        ...(n.author && { author: n.author["@id"] ?? n.author }),
        ...(n.publisher && { publisher: n.publisher["@id"] ?? n.publisher }),
      })),
    };
  }
  // Single node
  return {
    "@context": data["@context"],
    "@type": data["@type"],
    "@id": data["@id"],
    ...(data.name && { name: data.name }),
    ...(data.url && { url: data.url }),
  };
}

// ---------- Fetcher ----------

async function snapshotUrl(absoluteUrl, relativePath) {
  const t0 = Date.now();
  let res, body, headers = {};
  try {
    res = await fetch(absoluteUrl, {
      headers: { "User-Agent": "BallersHub-SEO-Drift/1.0" },
      redirect: "manual",
    });
    headers = Object.fromEntries(res.headers.entries());
    body = await res.text();
  } catch (err) {
    return {
      path: relativePath,
      status: 0,
      error: err.message ?? String(err),
      ms: Date.now() - t0,
    };
  }

  const isHtml = (headers["content-type"] ?? "").includes("text/html");
  const isXml = relativePath.endsWith(".xml") || (headers["content-type"] ?? "").includes("xml");
  const isTxt = relativePath.endsWith(".txt") || (headers["content-type"] ?? "").includes("text/plain");

  const snap = {
    path: relativePath,
    status: res.status,
    contentType: headers["content-type"] ?? null,
    contentLength: body.length,
    cacheControl: headers["cache-control"] ?? null,
    xRobotsTag: headers["x-robots-tag"] ?? null,
    ms: Date.now() - t0,
  };

  if (isHtml && res.status === 200) {
    snap.title = extractTitle(body);
    snap.description = extractMetaTag(body, "name", "description");
    snap.canonical = extractCanonical(body);
    snap.robotsMeta = extractMetaTag(body, "name", "robots");
    snap.og = {
      title: extractMetaTag(body, "property", "og:title"),
      description: extractMetaTag(body, "property", "og:description"),
      image: extractMetaTag(body, "property", "og:image"),
      type: extractMetaTag(body, "property", "og:type"),
      url: extractMetaTag(body, "property", "og:url"),
      siteName: extractMetaTag(body, "property", "og:site_name"),
      locale: extractMetaTag(body, "property", "og:locale"),
    };
    snap.twitter = {
      card: extractMetaTag(body, "name", "twitter:card"),
      title: extractMetaTag(body, "name", "twitter:title"),
    };
    snap.jsonLd = extractJsonLdBlocks(body);
  }

  if (isXml || isTxt) {
    // Para sitemap/llms.txt/robots.txt: contamos lo importante en lugar
    // de meter el contenido entero al baseline.
    if (relativePath === "/sitemap.xml") {
      const urlCount = (body.match(/<url>/g) ?? []).length;
      const sample = body.match(/<loc>([^<]+)<\/loc>/g)?.slice(0, 3).map((s) => s.replace(/<\/?loc>/g, "")) ?? [];
      snap.sitemap = { urlCount, sampleLocs: sample };
    } else if (relativePath === "/llms.txt") {
      snap.llmstxt = {
        lines: body.split("\n").length,
        sections: body.match(/^## /gm)?.length ?? 0,
        hasBlog: body.includes("## Blog"),
        hasAutores: body.includes("## Autores"),
      };
    } else if (relativePath === "/robots.txt") {
      snap.robots = {
        disallows: (body.match(/^Disallow:/gm) ?? []).length,
        hasSitemap: body.includes("Sitemap:"),
        hasHost: body.includes("Host:"),
      };
    }
  }

  return snap;
}

// ---------- Main ----------

(async () => {
  console.log(`Capturando baseline desde ${BASE}…`);
  const snapshots = [];
  for (const p of URLS) {
    const abs = `${BASE}${p}`;
    process.stdout.write(`  ${p} … `);
    const snap = await snapshotUrl(abs, p);
    snapshots.push(snap);
    console.log(`${snap.status} (${snap.ms}ms)`);
  }

  const baseline = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    snapshots,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2));
  console.log(`\nGuardado: ${OUT}`);

  // Symlink a "baseline.json" para que compare lo encuentre fácil.
  const symlinkPath = path.join(path.dirname(OUT), "baseline.json");
  if (fs.existsSync(symlinkPath) || fs.lstatSync(symlinkPath, { throwIfNoEntry: false })) {
    try { fs.unlinkSync(symlinkPath); } catch {}
  }
  // Symlinks no se commitean bien en algunos OS. Mejor un archivo regular con la ruta.
  fs.writeFileSync(
    symlinkPath,
    JSON.stringify({ latest: path.basename(OUT) }, null, 2) + "\n",
  );
  console.log(`Pointer: ${symlinkPath} → ${path.basename(OUT)}`);
})().catch((err) => { console.error("ERROR:", err); process.exit(1); });
