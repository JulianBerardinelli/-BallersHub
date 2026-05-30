#!/usr/bin/env node
// Compara un baseline guardado vs un snapshot fresco (re-capturado ahora).
// Imprime un reporte clasificado por severidad.
//
// Uso:
//   node scripts/seo/compare-baseline.cjs
//   node scripts/seo/compare-baseline.cjs --baseline docs/seo/drift/baseline-2026-05-28.json
//   node scripts/seo/compare-baseline.cjs --base https://ballershub.co

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BASE = (process.argv.find((a, i) => process.argv[i - 1] === "--base") ||
  process.env.BH_BASE_URL || "https://ballershub.co").replace(/\/+$/, "");

const baselineFlag = process.argv.find((a, i) => process.argv[i - 1] === "--baseline");
let baselinePath;
if (baselineFlag) {
  baselinePath = baselineFlag;
} else {
  // Resolver baseline.json → archivo apuntado
  const pointer = JSON.parse(
    fs.readFileSync("docs/seo/drift/baseline.json", "utf-8"),
  );
  baselinePath = path.join("docs/seo/drift", pointer.latest);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
console.log(`Baseline: ${baselinePath} (capturado ${baseline.capturedAt})\n`);

// Capturar snapshot actual (escribiéndolo a un archivo temporal)
const tmpSnap = path.join("/tmp", `bh-drift-current-${Date.now()}.json`);
console.log(`Capturando snapshot actual desde ${BASE}…`);
execSync(`node scripts/seo/capture-baseline.cjs --out "${tmpSnap}" --base "${BASE}"`, {
  stdio: "inherit",
});
const current = JSON.parse(fs.readFileSync(tmpSnap, "utf-8"));
fs.unlinkSync(tmpSnap);
console.log("");

// ---------- Comparador ----------

const CRITICAL_FIELDS = ["status", "canonical", "robotsMeta", "title"];
const MAJOR_FIELDS = ["description", "og.title", "og.description", "og.image", "og.type"];
const INFO_FIELDS = ["contentType", "contentLength"];

function get(obj, dotPath) {
  return dotPath.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function diffSnapshot(b, c) {
  const issues = [];
  for (const f of CRITICAL_FIELDS) {
    const bv = get(b, f), cv = get(c, f);
    if (bv !== cv) issues.push({ severity: "CRITICAL", field: f, before: bv, after: cv });
  }
  for (const f of MAJOR_FIELDS) {
    const bv = get(b, f), cv = get(c, f);
    if (bv !== cv) issues.push({ severity: "MAJOR", field: f, before: bv, after: cv });
  }
  // contentLength: solo flagueamos cambios >10% para evitar ruido
  const bLen = b.contentLength ?? 0, cLen = c.contentLength ?? 0;
  if (bLen && Math.abs(cLen - bLen) / bLen > 0.10) {
    issues.push({
      severity: "INFO",
      field: "contentLength",
      before: bLen,
      after: cLen,
      note: `${(((cLen - bLen) / bLen) * 100).toFixed(0)}% change`,
    });
  }
  // JSON-LD counts
  const bJsonLd = (b.jsonLd ?? []).length, cJsonLd = (c.jsonLd ?? []).length;
  if (bJsonLd !== cJsonLd) {
    issues.push({
      severity: "MAJOR",
      field: "jsonLd.count",
      before: bJsonLd,
      after: cJsonLd,
    });
  }
  // JSON-LD types (sumario)
  const bTypes = jsonLdTypes(b.jsonLd ?? []);
  const cTypes = jsonLdTypes(c.jsonLd ?? []);
  if (bTypes.join(",") !== cTypes.join(",")) {
    issues.push({
      severity: "MAJOR",
      field: "jsonLd.types",
      before: bTypes,
      after: cTypes,
    });
  }
  return issues;
}

function jsonLdTypes(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b && b["@graph"]) {
      for (const n of b["@graph"]) out.push(n["@type"] ?? "?");
    } else if (b && b["@type"]) {
      out.push(b["@type"]);
    }
  }
  return out.sort();
}

// ---------- Reporte ----------

const bMap = new Map(baseline.snapshots.map((s) => [s.path, s]));
const cMap = new Map(current.snapshots.map((s) => [s.path, s]));

const allPaths = new Set([...bMap.keys(), ...cMap.keys()]);
const report = { critical: [], major: [], info: [], unchanged: [] };

for (const p of allPaths) {
  const b = bMap.get(p), c = cMap.get(p);
  if (!b) { report.major.push({ path: p, note: "URL nueva (no estaba en baseline)" }); continue; }
  if (!c) { report.critical.push({ path: p, note: "URL faltante en snapshot actual" }); continue; }
  const issues = diffSnapshot(b, c);
  if (issues.length === 0) { report.unchanged.push(p); continue; }
  for (const i of issues) {
    report[i.severity.toLowerCase()].push({ path: p, ...i });
  }
}

// Print
const banner = (s, fg = "") => `${fg}${s}\x1b[0m`;
console.log(banner("=".repeat(60), "\x1b[1m"));
console.log(banner("SEO DRIFT COMPARE", "\x1b[1m"));
console.log(banner("=".repeat(60), "\x1b[1m"));
console.log(`Baseline:  ${baseline.capturedAt}`);
console.log(`Current:   ${current.capturedAt}`);
console.log(`URLs:      ${allPaths.size} comparadas`);
console.log("");

const sections = [
  { key: "critical", label: "🔴 CRITICAL", color: "\x1b[31m" },
  { key: "major", label: "🟠 MAJOR", color: "\x1b[33m" },
  { key: "info", label: "🟡 INFO", color: "\x1b[36m" },
];

for (const sec of sections) {
  const items = report[sec.key];
  if (items.length === 0) continue;
  console.log(banner(`${sec.label} (${items.length})`, sec.color));
  for (const i of items) {
    console.log(`  ${i.path}`);
    if (i.field) {
      console.log(`    ${i.field}: ${JSON.stringify(i.before)} → ${JSON.stringify(i.after)}`);
    }
    if (i.note) console.log(`    ${i.note}`);
  }
  console.log("");
}

console.log(banner(`✅ UNCHANGED: ${report.unchanged.length} URLs sin cambios`, "\x1b[32m"));
console.log("");

const exitCode = report.critical.length > 0 ? 2 : (report.major.length > 0 ? 1 : 0);
console.log(
  `Exit ${exitCode} ` +
  (exitCode === 0 ? "(todo OK)" : exitCode === 1 ? "(majors detectados, revisar)" : "(criticals detectados — bloquear)"),
);
process.exit(exitCode);
