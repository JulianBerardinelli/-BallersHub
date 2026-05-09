"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { ChevronDown, Pencil, X } from "lucide-react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import CountryFlag from "@/components/common/CountryFlag";
import EditPencilButton from "./EditPencilButton";
import { upsertAgencyCountryProfileAction } from "@/app/actions/agency-country-profiles";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";

type CountryProfile = {
  countryCode: string;
  description: string | null;
};

type Props = {
  agencyName: string;
  operativeCountries: string[];
  initialProfiles: CountryProfile[];
};

export default function CountriesSection({
  agencyName,
  operativeCountries,
  initialProfiles,
}: Props) {
  const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

  // Map ISO-2 → description. Stays in sync with operativeCountries (the
  // source of truth for which countries appear) — descriptions linger for
  // any code, but we only render those that the agency is actually
  // operating in.
  const initialMap = new Map(initialProfiles.map((p) => [p.countryCode, p.description ?? ""]));

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(operativeCountries.map((c) => [c, initialMap.get(c) ?? ""])),
  );

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const code of operativeCountries) {
        next[code] = code in prev ? prev[code] : initialMap.get(code) ?? "";
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operativeCountries.join(",")]);

  if (operativeCountries.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title="Países donde operás"
      description="Por cada país de tu alcance, escribí una breve narrativa: experiencia, hitos, equipos clave. Aparece en el portfolio público al expandir el país."
    >
      <div className="space-y-3">
        {operativeCountries.map((code) => (
          <CountryRow
            key={code}
            code={code}
            label={dnEs.of(code) ?? code}
            value={drafts[code] ?? ""}
            persisted={initialMap.get(code) ?? ""}
            isEditing={editingCode === code}
            agencyName={agencyName}
            onChange={(v) => setDrafts((prev) => ({ ...prev, [code]: v }))}
            onToggleEdit={() => setEditingCode((curr) => (curr === code ? null : code))}
            onCancel={() => {
              setDrafts((prev) => ({ ...prev, [code]: initialMap.get(code) ?? "" }));
              setEditingCode(null);
            }}
            onSaved={(saved) => {
              initialMap.set(code, saved);
              setEditingCode(null);
            }}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function CountryRow({
  code,
  label,
  value,
  persisted,
  isEditing,
  agencyName,
  onChange,
  onToggleEdit,
  onCancel,
  onSaved,
}: {
  code: string;
  label: string;
  value: string;
  persisted: string;
  isEditing: boolean;
  agencyName: string;
  onChange: (v: string) => void;
  onToggleEdit: () => void;
  onCancel: () => void;
  onSaved: (saved: string) => void;
}) {
  const { enqueue } = useNotificationContext();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const dirty = value.trim() !== (persisted ?? "").trim();

  const onSave = () => {
    startTransition(async () => {
      setStatus(null);
      try {
        await upsertAgencyCountryProfileAction({
          countryCode: code,
          description: value.trim() || null,
        });
        onSaved(value.trim());
        setStatus({ type: "success", message: "Descripción guardada." });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: `País · ${label}`,
            changedFields: ["descripción"],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Error al guardar.",
        });
      }
    });
  };

  return (
    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <CountryFlag code={code} size={22} />
        <span className="flex-1 font-bh-heading text-[14px] font-semibold text-bh-fg-1">
          {label}
        </span>
        <span className="font-bh-mono text-[10px] uppercase tracking-[0.18em] text-bh-fg-4">
          {code}
        </span>
        {persisted ? (
          <Chip size="sm" variant="flat" classNames={{ base: "bg-[rgba(204,255,0,0.10)] text-bh-lime", content: "text-[11px]" }}>
            Con descripción
          </Chip>
        ) : (
          <Chip size="sm" variant="flat" classNames={{ base: "bg-white/[0.04] text-bh-fg-4", content: "text-[11px]" }}>
            Sin descripción
          </Chip>
        )}
        <ChevronDown
          className={`h-4 w-4 text-bh-fg-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12px] leading-[1.55] text-bh-fg-3 max-w-2xl">
              Contá brevemente tu experiencia operando en {label}. Mostralo en el bloque
              de alcance del portfolio cuando un visitante seleccione este país.
            </p>
            <Button
              size="sm"
              variant="light"
              isIconOnly
              aria-label={isEditing ? "Cancelar" : "Editar"}
              onPress={onToggleEdit}
              isDisabled={isPending}
            >
              {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
            </Button>
          </div>

          <FormField
            as="textarea"
            label={`Sobre nuestra operación en ${label}`}
            placeholder={`Ej: En ${label} representamos jugadores desde 2015 con foco en primera división...`}
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={!isEditing}
            description="Hasta 2000 caracteres."
            maxLength={2000}
          />

          {status && (
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          )}

          {isEditing && (
            <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-3">
              <Button variant="light" onPress={onCancel} isDisabled={isPending}>
                Cancelar
              </Button>
              <Button
                onPress={onSave}
                isDisabled={isPending || !dirty}
                isLoading={isPending}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Guardar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
