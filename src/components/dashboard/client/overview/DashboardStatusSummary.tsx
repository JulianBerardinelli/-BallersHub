"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button, Chip, Divider } from "@heroui/react";

type HeroColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

type StatusDescriptor = {
  code: string;
  label: string;
  message: string;
  color: HeroColor;
};

type ApplicationDescriptor = {
  label: string;
  message: string;
  color: HeroColor;
  createdAtLabel: string | null;
};

type StatusCta = {
  label: string;
  href: string;
  variant: "solid" | "bordered" | "light";
  color: HeroColor;
};

export type DashboardStatusSummaryProps = {
  profileStatus: StatusDescriptor;
  visibility: string | null;
  publicUrl: string | null;
  updatedAt: string | null;
  applicationStatus: ApplicationDescriptor | null;
  cta?: StatusCta;
};

function getVisibilityCopy(visibility: string | null): string | null {
  if (!visibility) return null;
  if (visibility === "public") return "Perfil público";
  if (visibility === "private") return "Perfil privado";
  return `Visibilidad: ${visibility}`;
}

function getUpdatedCopy(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const formatted = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(updatedAt));
  return `Actualizado el ${formatted}`;
}

export default function DashboardStatusSummary({
  profileStatus,
  visibility,
  publicUrl,
  updatedAt,
  applicationStatus,
  cta,
}: DashboardStatusSummaryProps) {
  const visibilityCopy = getVisibilityCopy(visibility);
  const updatedCopy = getUpdatedCopy(updatedAt);

  return (
    <div className="space-y-5 text-sm text-neutral-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip color={profileStatus.color} variant="flat" size="sm" className="font-semibold uppercase tracking-wide">
              {profileStatus.label}
            </Chip>
            {visibilityCopy ? (
              <Chip color="default" variant="bordered" size="sm" className="uppercase tracking-wide text-neutral-400">
                {visibilityCopy}
              </Chip>
            ) : null}
          </div>

          <p className="max-w-2xl text-neutral-200">{profileStatus.message}</p>

          {publicUrl ? (
            <p className="text-xs text-neutral-400">
              URL pública:{" "}
              <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={publicUrl}>
                {publicUrl}
              </Link>
            </p>
          ) : null}

          {updatedCopy ? <p className="text-xs text-neutral-500">{updatedCopy}</p> : null}
        </div>

        {cta ? (
          <Button
            as={Link}
            href={cta.href}
            color={cta.color === "default" ? "primary" : cta.color}
            variant={cta.variant}
            className="w-full max-w-xs self-start lg:w-auto"
            endContent={<ArrowUpRight size={18} />}
          >
            {cta.label}
          </Button>
        ) : null}
      </div>

      {applicationStatus ? (
        <div className="space-y-3">
          <Divider className="bg-neutral-900" />
          <div className="flex flex-wrap items-center gap-3">
            <Chip color={applicationStatus.color} variant="flat" size="sm" className="font-semibold uppercase tracking-wide">
              Solicitud: {applicationStatus.label}
            </Chip>
            {applicationStatus.createdAtLabel ? (
              <span className="text-xs text-neutral-500">{applicationStatus.createdAtLabel}</span>
            ) : null}
          </div>
          <p className="text-xs text-neutral-400">{applicationStatus.message}</p>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">
          Todavía no registramos una solicitud activa. Iniciá el proceso de onboarding para generar tu perfil profesional.
        </p>
      )}
    </div>
  );
}
