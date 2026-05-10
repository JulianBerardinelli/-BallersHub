"use client";

// Standardized CTA button → /pricing with audience + currency + utm tags
// pre-baked. Use this anywhere a "Activá Pro" button is needed inside the
// dashboard.

import Link from "next/link";
import { buildUpgradeUrl } from "@/lib/dashboard/plan-access";
import type { FeatureId } from "@/lib/dashboard/feature-gates";
import { FEATURE_GATES } from "@/lib/dashboard/feature-gates";
import { usePlanAccess } from "./PlanAccessProvider";

export type UpgradeCtaProps = {
  feature?: FeatureId;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "lime" | "outlined";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<UpgradeCtaProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[13px]",
  lg: "px-5 py-2.5 text-sm",
};

const VARIANT_CLASSES: Record<NonNullable<UpgradeCtaProps["variant"]>, string> = {
  lime:
    "bg-bh-lime text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]",
  outlined:
    "border border-bh-lime/40 bg-bh-lime/5 text-bh-lime hover:bg-bh-lime/10",
};

export default function UpgradeCta({
  feature,
  label = "Activar Pro",
  size = "md",
  variant = "lime",
  className = "",
}: UpgradeCtaProps) {
  const { audience } = usePlanAccess();

  const utmCampaign = feature
    ? FEATURE_GATES[feature].utmCampaign
    : "dashboard-generic";

  const href = buildUpgradeUrl({
    audience,
    feature: utmCampaign,
    currency: "ARS",
  });

  const baseClasses =
    "inline-flex items-center justify-center gap-1.5 rounded-bh-md font-semibold transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)]";

  return (
    <Link
      href={href}
      className={`${baseClasses} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </Link>
  );
}
