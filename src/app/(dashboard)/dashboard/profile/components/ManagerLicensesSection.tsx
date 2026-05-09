"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Plus, Trash2, Award, ExternalLink, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";

import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import { updateManagerProfile } from "@/app/actions/manager-profiles";
import { bhButtonClass } from "@/components/ui/bh-button-class";

const LICENSES_MAX = 10;

type License = {
  type: string;
  number: string;
  url?: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

export default function ManagerLicensesSection({
  initialLicenses,
}: {
  initialLicenses: License[];
}) {
  const router = useRouter();
  const [defaults, setDefaults] = useState<License[]>(initialLicenses);
  const [licenses, setLicenses] = useState<License[]>(initialLicenses);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDefaults(initialLicenses);
    setLicenses(initialLicenses);
  }, [initialLicenses]);

  const isDirty =
    licenses.length !== defaults.length ||
    licenses.some(
      (l, i) =>
        l.type !== defaults[i]?.type ||
        l.number !== defaults[i]?.number ||
        l.url !== defaults[i]?.url,
    );

  const onCancel = () => {
    setLicenses(defaults);
    setIsEditing(false);
    setStatus(null);
  };

  const handleAdd = () => {
    if (licenses.length >= LICENSES_MAX) return;
    setLicenses([...licenses, { type: "", number: "", url: "" }]);
  };

  const handleUpdate = (index: number, field: keyof License, value: string) => {
    const updated = [...licenses];
    updated[index] = { ...updated[index], [field]: value };
    setLicenses(updated);
  };

  const handleRemove = (index: number) => {
    setLicenses(licenses.filter((_, i) => i !== index));
  };

  const onSave = () => {
    startTransition(async () => {
      setStatus(null);
      const cleaned = licenses.filter((l) => l.type.trim() && l.number.trim());
      const result = await updateManagerProfile({ licenses: cleaned });
      if (result.error) {
        setStatus({ type: "error", message: result.error });
        return;
      }
      setDefaults(cleaned);
      setLicenses(cleaned);
      setIsEditing(false);
      setStatus({ type: "success", message: "Licencias actualizadas." });
      router.refresh();
    });
  };

  return (
    <SectionCard
      title="Mis licencias"
      description="Tus licencias profesionales individuales (FIFA, federaciones, etc.). Aparecen en el portfolio de la agencia bajo tu nombre."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar licencias"}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <div className="space-y-4">
        {isEditing && (
          <div className="flex justify-end">
            <Button
              size="sm"
              startContent={<Plus className="h-4 w-4" />}
              onPress={handleAdd}
              isDisabled={licenses.length >= LICENSES_MAX}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Agregar licencia
            </Button>
          </div>
        )}

        {licenses.length === 0 && !isEditing ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-bh-surface-1/40 py-6 text-center text-sm text-bh-fg-4">
            Aún no cargaste licencias profesionales (FIFA, RFEF, AFA, CBF, etc.).
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            {licenses.length === 0 && (
              <p className="text-[12px] text-bh-fg-4">
                Hacé clic en “Agregar licencia” para empezar.
              </p>
            )}
            {licenses.map((lic, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 p-3 sm:flex-row sm:items-end"
              >
                <FormField
                  label="Entidad / Tipo"
                  placeholder="Ej: Licencia FIFA"
                  value={lic.type}
                  onChange={(e) => handleUpdate(index, "type", e.target.value)}
                  isRequired
                />
                <FormField
                  label="Número de licencia"
                  placeholder="Ej: 2023000123"
                  value={lic.number}
                  onChange={(e) => handleUpdate(index, "number", e.target.value)}
                  isRequired
                />
                <FormField
                  label="URL de verificación (opcional)"
                  placeholder="https://fifa.com/agent/..."
                  type="url"
                  value={lic.url || ""}
                  onChange={(e) => handleUpdate(index, "url", e.target.value)}
                />
                <Button
                  isIconOnly
                  variant="flat"
                  color="danger"
                  aria-label="Eliminar licencia"
                  className="mb-1"
                  onPress={() => handleRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {licenses.map((lic, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-white/[0.10] bg-bh-surface-1/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-bh-fg-1"
              >
                <Award className="h-4 w-4 text-bh-lime" />
                <span>{lic.type}</span>
                <span className="text-bh-fg-4 px-1">•</span>
                <span className="text-bh-fg-3">{lic.number}</span>
                {lic.url && (
                  <a
                    href={lic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-bh-lime hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {status && (
          <div>
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          </div>
        )}

        {isEditing && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={onCancel} isDisabled={isPending}>
              Cancelar
            </Button>
            <Button
              onPress={onSave}
              isDisabled={isPending || !isDirty}
              isLoading={isPending}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Guardar licencias
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
