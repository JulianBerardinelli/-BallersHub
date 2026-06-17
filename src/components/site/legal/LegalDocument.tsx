// src/components/site/legal/LegalDocument.tsx
// Data-driven renderer for the static legal pages (Terms / Privacy / Cookies).
// Content lives in the `legal` i18n namespace (src/i18n/messages/<locale>/legal.json)
// and is read with t.raw(), so the same component renders all three documents in
// the four locales. Typography reuses the blog's `.bh-article-prose` /
// `.bh-article-layout` / `.bh-toc` classes (src/styles/globals.css) so legal pages
// match the editorial styling for free (headings, lists, tables, sticky TOC).

import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

// Contact address — mirrors `senderEmail` in src/emails/tokens.ts.
const CONTACT_EMAIL = "info@ballershub.co";

export type LegalDocKey = "terms" | "privacy" | "cookies";

type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

type Section = { id: string; title: string; blocks: Block[] };

// Every legal page cross-links to the other two at the foot of the document.
const RELATED: Record<LegalDocKey, LegalDocKey[]> = {
  terms: ["privacy", "cookies"],
  privacy: ["terms", "cookies"],
  cookies: ["terms", "privacy"],
};

const HREF: Record<LegalDocKey, string> = {
  terms: "/legal/terms",
  privacy: "/legal/privacy",
  cookies: "/legal/cookies",
};

function LegalBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "h3":
      return <h3>{block.text}</h3>;
    case "list":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table>
          <thead>
            <tr>
              {block.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "p":
    default:
      return <p>{block.text}</p>;
  }
}

export default async function LegalDocument({ doc }: { doc: LegalDocKey }) {
  const t = await getTranslations("legal");
  const sections = t.raw(`${doc}.sections`) as Section[];

  return (
    <div className="bh-article-layout" style={{ "--acc": "#ccff00" } as CSSProperties}>
      {/* Sticky table of contents (hidden < 1040px by .bh-article-layout). */}
      <aside className="bh-toc">
        <div className="sticky top-[110px]">
          <p className="mb-4 font-bh-mono text-[11px] uppercase tracking-[0.2em] text-bh-fg-3">
            {t("common.tocLabel")}
          </p>
          <nav className="flex flex-col gap-2.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="font-bh-body text-[13.5px] leading-snug text-bh-fg-3 transition-colors hover:text-bh-lime"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      <div className="bh-article-col">
        <header className="mb-10 border-b border-white/10 pb-8">
          <p className="font-bh-mono text-xs uppercase tracking-[0.2em] text-bh-lime">
            {t("common.eyebrow")}
          </p>
          <h1 className="mt-3 font-bh-display text-[clamp(36px,6vw,58px)] font-extrabold uppercase leading-[0.95] text-bh-fg-1">
            {t(`${doc}.title`)}
          </h1>
          <p className="mt-4 font-bh-mono text-[13px] text-bh-fg-3">
            {t("common.updatedLabel")}: {t(`${doc}.updated`)}
          </p>
        </header>

        <div className="bh-article-prose">
          <p>{t(`${doc}.intro`)}</p>
          {sections.map((s) => (
            <section key={s.id}>
              <h2 id={s.id}>{s.title}</h2>
              {s.blocks.map((b, i) => (
                <LegalBlock key={i} block={b} />
              ))}
            </section>
          ))}
        </div>

        {/* Contact card */}
        <div className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] p-7">
          <h2 className="m-0 font-bh-heading text-xl font-bold text-bh-fg-1">
            {t("common.contactTitle")}
          </h2>
          <p className="mt-2 font-bh-body text-[15px] leading-relaxed text-bh-fg-2">
            {t("common.contactBody")}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-bh-lime px-5 py-2.5 font-bh-heading text-sm font-bold text-bh-black transition-transform hover:scale-[1.02]"
          >
            {t("common.contactCta")}
          </a>
        </div>

        {/* Related legal documents */}
        <div className="mt-10 border-t border-white/10 pt-7">
          <p className="mb-4 font-bh-mono text-[11px] uppercase tracking-[0.2em] text-bh-fg-3">
            {t("common.relatedLabel")}
          </p>
          <div className="flex flex-wrap gap-3">
            {RELATED[doc].map((key) => (
              <Link
                key={key}
                href={HREF[key]}
                className="rounded-full border border-white/15 px-4 py-2 font-bh-body text-sm text-bh-fg-2 transition-colors hover:border-bh-lime hover:text-bh-lime"
              >
                {t(`common.nav.${key}`)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
