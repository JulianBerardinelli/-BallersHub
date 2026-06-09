#!/usr/bin/env node
// i18n key-parity check.
//
// Every locale must expose EXACTLY the same message keys as the reference
// locale (es) for every namespace. A missing key ships as a silent next-intl
// fallback (or a MISSING_MESSAGE error); an extra key is dead weight / a typo.
// Arrays are compared by index so a translated list that lost/gained an item
// (e.g. a pricing comparison row) is caught too.
//
// Run: `npm run i18n:check`. Exit 1 on any mismatch. No CI exists yet — wire
// this into a pre-push hook or a GitHub Action when one is added.

const fs = require("node:fs");
const path = require("node:path");

const MESSAGES_DIR = path.join(__dirname, "..", "..", "src", "i18n", "messages");
const REFERENCE = "es";
const LOCALES = ["es", "en", "it", "pt"];

/** Collect every leaf key-path of a JSON value (objects by key, arrays by index). */
function flatten(value, prefix = "", out = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      flatten(value[k], prefix ? `${prefix}.${k}` : k, out);
    }
  } else {
    out.add(prefix);
  }
  return out;
}

function loadNamespace(locale, ns) {
  const file = path.join(MESSAGES_DIR, locale, ns);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const referenceDir = path.join(MESSAGES_DIR, REFERENCE);
const namespaces = fs
  .readdirSync(referenceDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

let problems = 0;

for (const ns of namespaces) {
  const refKeys = flatten(loadNamespace(REFERENCE, ns));
  for (const locale of LOCALES) {
    if (locale === REFERENCE) continue;
    const data = loadNamespace(locale, ns);
    if (data === null) {
      console.error(`✖ ${locale}/${ns} — falta el archivo (existe en ${REFERENCE}/)`);
      problems++;
      continue;
    }
    const keys = flatten(data);
    const missing = [...refKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !refKeys.has(k));
    if (missing.length || extra.length) {
      problems++;
      console.error(`✖ ${locale}/${ns}`);
      if (missing.length) {
        console.error(
          `   faltan (${missing.length}): ${missing.slice(0, 25).join(", ")}${missing.length > 25 ? " …" : ""}`,
        );
      }
      if (extra.length) {
        console.error(
          `   sobran (${extra.length}): ${extra.slice(0, 25).join(", ")}${extra.length > 25 ? " …" : ""}`,
        );
      }
    }
  }
}

if (problems > 0) {
  console.error(
    `\n${problems} desincronización(es). Ajustá src/i18n/messages/<locale>/ para que coincidan con ${REFERENCE}/.`,
  );
  process.exit(1);
}

console.log(
  `✓ i18n key parity OK — ${namespaces.length} namespaces × ${LOCALES.length} locales coinciden con ${REFERENCE}/.`,
);
