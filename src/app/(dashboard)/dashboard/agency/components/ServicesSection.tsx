"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import FormField from "@/components/dashboard/client/FormField";
import EditPencilButton from "./EditPencilButton";
import { updateAgencyProfile } from "@/app/actions/agencies";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";
import { SERVICE_ICONS, resolveServiceIcon } from "@/lib/agency/service-icons";

const SERVICES_MAX = 12;

type Service = {
  title: string;
  icon: string;
  color: string | null;
  description: string | null;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  agencyName: string;
  initialServices: Service[];
};

const DEFAULT_ICON = "briefcase";

const blankService = (): Service => ({
  title: "",
  icon: DEFAULT_ICON,
  color: null,
  description: null,
});

function sanitizeIncoming(items: Service[]): Service[] {
  return items.map((s) => ({
    title: s.title ?? "",
    icon: s.icon ?? DEFAULT_ICON,
    color: s.color ?? null,
    description: s.description ?? null,
  }));
}

function isEqual(a: Service[], b: Service[]) {
  if (a.length !== b.length) return false;
  return a.every(
    (s, i) =>
      s.title === b[i]?.title &&
      s.icon === b[i]?.icon &&
      s.color === b[i]?.color &&
      s.description === b[i]?.description,
  );
}

export default function ServicesSection({ agencyId, agencyName, initialServices }: Props) {
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<Service[]>(() => sanitizeIncoming(initialServices));
  const [services, setServices] = useState<Service[]>(() => sanitizeIncoming(initialServices));
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const next = sanitizeIncoming(initialServices);
    setDefaults(next);
    setServices(next);
  }, [initialServices]);

  const dirty = !isEqual(services, defaults);

  const onCancel = () => {
    setServices(defaults);
    setIsEditing(false);
    setStatus(null);
  };

  const handleAdd = () => {
    if (services.length >= SERVICES_MAX) return;
    setServices([...services, blankService()]);
  };

  const handleUpdate = (idx: number, patch: Partial<Service>) => {
    setServices(services.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleRemove = (idx: number) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  const onSave = () => {
    startTransition(async () => {
      setStatus(null);
      const cleaned = services
        .map((s) => ({
          title: s.title.trim(),
          icon: s.icon || DEFAULT_ICON,
          color: s.color?.trim() || null,
          description: s.description?.trim() || null,
        }))
        .filter((s) => s.title.length > 0);

      try {
        await updateAgencyProfile(agencyId, { services: cleaned });
        setDefaults(cleaned);
        setServices(cleaned);
        setIsEditing(false);
        setStatus({ type: "success", message: "Servicios actualizados." });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: "Servicios",
            changedFields: cleaned.map((s) => s.title),
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : "Error al guardar servicios.",
        });
      }
    });
  };

  return (
    <SectionCard
      title="Servicios"
      description={`Áreas de trabajo de la agencia. Cada servicio puede tener título, ícono, color y descripción. Hasta ${SERVICES_MAX}.`}
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel="servicios"
        />
      }
    >
      <div className="space-y-4">
        {services.length === 0 && !isEditing ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-bh-surface-1/40 py-6 text-center text-sm text-bh-fg-4">
            Sin servicios registrados todavía.
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            {services.map((s, idx) => (
              <ServiceEditor
                key={idx}
                service={s}
                onChange={(patch) => handleUpdate(idx, patch)}
                onRemove={() => handleRemove(idx)}
              />
            ))}
            <div className="flex justify-end">
              <Button
                size="sm"
                startContent={<Plus className="h-4 w-4" />}
                onPress={handleAdd}
                isDisabled={services.length >= SERVICES_MAX}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Agregar servicio
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, idx) => {
              const Icon = resolveServiceIcon(s.icon);
              const accent = s.color || undefined;
              return (
                <div
                  key={idx}
                  className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 p-4 space-y-2"
                >
                  <div
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: accent
                        ? `color-mix(in srgb, ${accent} 18%, transparent)`
                        : "rgba(204,255,0,0.12)",
                      color: accent ?? "var(--bh-lime, #ccff00)",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="font-bh-heading text-sm font-bold uppercase tracking-tight text-bh-fg-1">
                    {s.title}
                  </div>
                  {s.description && (
                    <p className="text-[12px] leading-[1.55] text-bh-fg-3 line-clamp-3">
                      {s.description}
                    </p>
                  )}
                </div>
              );
            })}
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
              isDisabled={isPending || !dirty}
              isLoading={isPending}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Guardar servicios
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ServiceEditor({
  service,
  onChange,
  onRemove,
}: {
  service: Service;
  onChange: (patch: Partial<Service>) => void;
  onRemove: () => void;
}) {
  const Icon = resolveServiceIcon(service.icon);
  const accent = service.color || "#CCFF00";

  return (
    <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-bh-md shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <FormField
            label="Título del servicio"
            placeholder="Ej: Representación de jugadores"
            value={service.title}
            onChange={(e) => onChange({ title: e.target.value })}
            isRequired
            maxLength={60}
          />
        </div>
        <Button
          isIconOnly
          variant="flat"
          color="danger"
          aria-label="Eliminar servicio"
          className="mt-5 shrink-0"
          onPress={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
            Ícono
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_ICONS.map((opt) => {
              const isActive = service.icon === opt.key;
              const Opt = opt.Icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onChange({ icon: opt.key })}
                  aria-label={opt.label}
                  title={opt.label}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-bh-md border transition-colors ${
                    isActive
                      ? "border-[rgba(204,255,0,0.45)] bg-[rgba(204,255,0,0.12)] text-bh-lime"
                      : "border-white/[0.08] bg-bh-surface-2 text-bh-fg-3 hover:border-white/[0.18] hover:text-bh-fg-1"
                  }`}
                >
                  <Opt className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
            Color (opcional)
          </span>
          <div className="flex h-11 items-center gap-2 rounded-bh-md border border-white/[0.08] bg-bh-surface-1 px-2">
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-bh-md border border-white/[0.12]">
              <input
                type="color"
                value={service.color || "#CCFF00"}
                onChange={(e) => onChange({ color: e.target.value })}
                className="absolute -left-[10px] -top-[10px] h-20 w-20 cursor-pointer opacity-0"
              />
              <div
                className="pointer-events-none h-full w-full"
                style={{ backgroundColor: service.color || "#CCFF00" }}
              />
            </div>
            <input
              type="text"
              value={service.color ?? ""}
              placeholder="#CCFF00"
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-full bg-transparent font-bh-mono text-[12px] uppercase tracking-widest text-bh-fg-1 placeholder:text-bh-fg-4 focus:outline-none"
            />
            {service.color && (
              <button
                type="button"
                onClick={() => onChange({ color: null })}
                className="text-[10px] text-bh-fg-4 hover:text-bh-fg-2 px-1"
                title="Usar acento de tema"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <FormField
        as="textarea"
        label="Descripción (opcional)"
        placeholder="Describí brevemente este servicio (qué incluye, a quién va dirigido)..."
        rows={2}
        value={service.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
        maxLength={280}
      />
    </div>
  );
}
