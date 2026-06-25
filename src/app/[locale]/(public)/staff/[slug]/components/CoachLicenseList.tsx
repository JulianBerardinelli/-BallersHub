"use client";

import * as React from "react";
import Image from "next/image";
import { federationFor, licenseDocKind } from "@/lib/coach/license-logos";

export type PublicLicense = {
  id: string;
  title: string;
  issuer: string | null;
  year: number | null;
  docUrl: string | null;
};

// Public license list with a BallersHub document modal. A license with a PDF or
// image doc opens an in-app modal; a license whose doc is an external link
// redirects to a new tab; one with no doc is a plain (non-interactive) card.
// Known issuers (FIFA, UEFA, FIGC, RFEF, AFA…) render their federation logo.
export default function CoachLicenseList({
  licenses,
  verifiedLabel = "Verificada",
  accent = "#ccff00",
}: {
  licenses: PublicLicense[];
  verifiedLabel?: string;
  /** Brand accent for card border/checkmark (Pro layout themes this per coach). */
  accent?: string;
}) {
  const [active, setActive] = React.useState<PublicLicense | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {licenses.map((l) => {
          const kind = licenseDocKind(l.docUrl);
          const inner = <LicenseCardInner license={l} verifiedLabel={verifiedLabel} accent={accent} />;
          if (l.docUrl && (kind === "pdf" || kind === "image")) {
            return (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => setActive(l)}
                  className="w-full text-left transition-transform hover:-translate-y-px"
                >
                  {inner}
                </button>
              </li>
            );
          }
          if (l.docUrl && kind === "external") {
            return (
              <li key={l.id}>
                <a
                  href={l.docUrl}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="block transition-transform hover:-translate-y-px"
                >
                  {inner}
                </a>
              </li>
            );
          }
          return <li key={l.id}>{inner}</li>;
        })}
      </ul>

      {active && active.docUrl && (
        <LicenseModal license={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}

function LicenseCardInner({
  license,
  verifiedLabel,
  accent,
}: {
  license: PublicLicense;
  verifiedLabel: string;
  accent: string;
}) {
  const fed = federationFor(license.issuer, license.title);
  const kind = licenseDocKind(license.docUrl);
  return (
    <div
      className="flex h-full items-center gap-3 rounded-xl border p-4"
      style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0f` }}
    >
      <LicenseBadge fed={fed} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span aria-hidden style={{ color: accent }}>✓</span>
          <span className="truncate font-bh-display text-sm font-bold uppercase text-bh-fg-1">
            {license.title}
          </span>
        </div>
        <p className="mt-0.5 truncate font-body text-xs text-bh-fg-3">
          {[license.issuer, license.year].filter(Boolean).join(" · ")}
          <span className="ml-1 text-bh-fg-4">· {verifiedLabel}</span>
        </p>
      </div>
      {license.docUrl && (
        <span
          className="shrink-0 font-bh-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: accent }}
        >
          {kind === "external" ? "Link ↗" : "Ver ↗"}
        </span>
      )}
    </div>
  );
}

function LicenseBadge({ fed }: { fed: ReturnType<typeof federationFor> }) {
  if (fed?.src) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.06] p-1">
        <Image src={fed.src} alt={fed.label} width={36} height={36} className="object-contain" />
      </span>
    );
  }
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-lg font-bh-display text-[11px] font-black tracking-[0.02em]"
      style={{ background: `${fed?.color ?? "#94A3B8"}26`, color: fed?.color ?? "#94A3B8" }}
    >
      {fed?.abbr ?? "DT"}
    </span>
  );
}

function LicenseModal({ license, onClose }: { license: PublicLicense; onClose: () => void }) {
  const kind = licenseDocKind(license.docUrl);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={license.title}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-bh-surface-1 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate font-bh-display text-sm font-bold uppercase text-bh-fg-1">
              {license.title}
            </p>
            <p className="truncate font-body text-[11px] text-bh-fg-3">
              {[license.issuer, license.year].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={license.docUrl ?? "#"}
              target="_blank"
              rel="noreferrer nofollow"
              className="rounded-bh-pill border border-white/[0.12] px-3 py-1.5 text-[11px] font-semibold text-bh-fg-2 hover:border-white/[0.24]"
            >
              Abrir original ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-bh-pill bg-bh-lime px-3 py-1.5 text-[11px] font-bold text-bh-black hover:bg-[#d8ff26]"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-bh-black/40">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={license.docUrl ?? ""}
              alt={license.title}
              className="mx-auto max-h-[78vh] w-auto object-contain"
            />
          ) : (
            <iframe
              src={license.docUrl ?? ""}
              title={license.title}
              className="h-[78vh] w-full"
              loading="lazy"
            />
          )}
        </div>
      </div>
    </div>
  );
}
