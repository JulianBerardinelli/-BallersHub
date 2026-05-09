"use client";

import { Sparkles, ExternalLink } from "lucide-react";

type Props = {
  maxBytes?: number;
  accept?: string;
};

function describeFormats(accept?: string) {
  if (!accept) return "JPG, PNG o WebP";
  const formats = accept
    .split(",")
    .map((s) => s.trim().split("/")[1]?.toUpperCase())
    .filter(Boolean);
  if (formats.length === 0) return "JPG, PNG o WebP";
  return formats.join(", ");
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SquooshHint({ maxBytes = 2 * 1024 * 1024, accept }: Props) {
  return (
    <div className="flex items-start gap-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/40 p-2.5 text-[11px] leading-[1.55] text-bh-fg-3">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bh-lime" />
      <span>
        Recomendado: imágenes de hasta <strong className="text-bh-fg-1">{formatBytes(maxBytes)}</strong> en formato {describeFormats(accept)}.
        {" "}Si tu archivo pesa más, comprimilo gratis y sin perder calidad en{" "}
        <a
          href="https://squoosh.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-bh-lime hover:underline"
        >
          squoosh.app <ExternalLink className="h-3 w-3" />
        </a>
        .
      </span>
    </div>
  );
}
