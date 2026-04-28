"use client";

import * as React from "react";
import {
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
} from "@heroui/react";
import { Globe, Instagram, Link as LinkIcon, Pencil, FileText, Camera } from "lucide-react";
import CountryFlag from "@/components/common/CountryFlag";
import CountryMultiPicker, {
  type CountryPick,
} from "@/components/common/CountryMultiPicker";
import PositionPicker, {
  type PositionPickerValue,
} from "@/components/common/PositionPicker";
import type { ApplicationRow } from "../types";
import { formatBirthDate } from "../utils";

import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";

export type PersonalInfoFormValues = {
  full_name: string;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  nationalities: CountryPick[];
  position: PositionPickerValue;
};

type ModalClassNames = {
  header?: string;
  body?: string;
  footer?: string;
};

type PersonalInfoModalProps = {
  application: ApplicationRow;
  mode: "detail" | "review";
  classNames?: ModalClassNames;
  onApprove: () => Promise<void>;
  onSave: (values: PersonalInfoFormValues) => Promise<void>;
};

function getDefaultPosition(app: ApplicationRow): PositionPickerValue {
  if (app.positions.length > 0) {
    return {
      role: app.positions[0] as PositionPickerValue["role"],
      subs: app.positions.slice(1),
    };
  }
  return { role: "DEL", subs: [] };
}

export default function PersonalInfoModal({
  application,
  mode,
  classNames,
  onApprove,
  onSave,
}: PersonalInfoModalProps) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    full_name: application.applicant ?? "",
    birth_date: application.birth_date ?? "",
    height_cm: application.height_cm?.toString() ?? "",
    weight_kg: application.weight_kg?.toString() ?? "",
    nationalities: application.nationalities.map((n) => ({
      code: n.code ?? "",
      name: n.name,
    })),
    position: getDefaultPosition(application),
  });
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEditing(false);
    setTouched({});
    setForm({
      full_name: application.applicant ?? "",
      birth_date: application.birth_date ?? "",
      height_cm: application.height_cm?.toString() ?? "",
      weight_kg: application.weight_kg?.toString() ?? "",
      nationalities: application.nationalities.map((n) => ({
        code: n.code ?? "",
        name: n.name,
      })),
      position: getDefaultPosition(application),
    });
  }, [application]);

  const minChars = (v: string, n = 3) => (v?.trim()?.length ?? 0) >= n;

  const heightNumber = form.height_cm ? Number(form.height_cm) : NaN;
  const weightNumber = form.weight_kg ? Number(form.weight_kg) : NaN;

  const nameInvalid = !!touched.full_name && !minChars(form.full_name);
  const natInvalid = !!touched.nationalities && form.nationalities.length < 1;
  const dobInvalid = !!touched.birth_date && !form.birth_date;
  const heightInvalid =
    !!touched.height_cm &&
    !(Number.isFinite(heightNumber) && heightNumber >= 120 && heightNumber <= 230);
  const weightInvalid =
    !!touched.weight_kg &&
    !(Number.isFinite(weightNumber) && weightNumber >= 40 && weightNumber <= 140);
  const posInvalid = !!touched.position && form.position.subs.length < 1;

  const formValid =
    minChars(form.full_name) &&
    form.nationalities.length >= 1 &&
    !!form.birth_date &&
    Number.isFinite(heightNumber) &&
    heightNumber >= 120 &&
    heightNumber <= 230 &&
    Number.isFinite(weightNumber) &&
    weightNumber >= 40 &&
    weightNumber <= 140 &&
    form.position.subs.length >= 1;

  async function handleSave() {
    setTouched({
      full_name: true,
      nationalities: true,
      birth_date: true,
      height_cm: true,
      weight_kg: true,
      position: true,
    });
    if (!formValid) return;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        full_name: form.full_name.trim(),
        birth_date: form.birth_date,
        height_cm: Number(heightNumber.toFixed(0)),
        weight_kg: Number(weightNumber.toFixed(0)),
        nationalities: form.nationalities,
        position: form.position,
      });
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los datos.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      await onApprove();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo aprobar la información.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <>
      <ModalHeader className={classNames?.header}>
        <div className="flex items-start gap-2 w-full">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-medium truncate">{application.applicant ?? "(sin nombre)"}</span>
              {application.nationalities.map((n, index) =>
                n.code ? <CountryFlag key={`${n.code}-${index}`} code={n.code} size={14} /> : null,
              )}
            </div>
            <span className="text-xs text-bh-fg-3">
              {mode === "review" ? "Revisar datos personales" : "Detalle del jugador"}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            {application.links.map((link, i) => {
              const low = link.url.toLowerCase();
              let Icon = LinkIcon;
              if (low.includes("instagram")) Icon = Instagram;
              else if (low.includes("transfermarkt") || low.includes("besoccer")) Icon = Globe;
              return (
                <a key={i} href={link.url} target="_blank" className="text-bh-fg-3">
                  <Icon size={16} />
                </a>
              );
            })}
            {!editing && (
              <Button
                size="sm"
                variant="flat"
                onPress={() => setEditing(true)}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                <Pencil size={14} className="mr-2" /> Editar
              </Button>
            )}
          </div>
        </div>
      </ModalHeader>
      <ModalBody className={classNames?.body}>
        {editing ? (
          <div className="grid gap-4">
            <FormField
              isRequired
              label="Nombre completo"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, full_name: true }))}
              isInvalid={nameInvalid}
              errorMessage="Ingresá al menos 3 caracteres."
            />
            <div onBlurCapture={() => setTouched((t) => ({ ...t, nationalities: true }))}>
              <CountryMultiPicker
                key={`nat-${application.id}`}
                defaultValue={form.nationalities}
                onChange={(vals) => setForm((f) => ({ ...f, nationalities: vals }))}
                isInvalid={natInvalid}
                errorMessage="Seleccioná al menos una nacionalidad."
              />
            </div>
            <FormField
              isRequired
              label="Fecha de nacimiento"
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
              onBlur={() => setTouched((t) => ({ ...t, birth_date: true }))}
              isInvalid={dobInvalid}
              errorMessage="Seleccioná la fecha de nacimiento."
            />
            <div className="flex flex-wrap gap-6">
              <FormField
                isRequired
                label="Altura (cm)"
                type="number"
                value={form.height_cm}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    height_cm: e.target.value,
                  }))
                }
                onBlur={() => setTouched((t) => ({ ...t, height_cm: true }))}
                isInvalid={heightInvalid}
                errorMessage="Ingresá una altura válida (120–230 cm)."
                endContent={<span className="text-xs text-bh-fg-4">cm</span>}
              />
              <FormField
                isRequired
                label="Peso (kg)"
                type="number"
                value={form.weight_kg}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    weight_kg: e.target.value,
                  }))
                }
                onBlur={() => setTouched((t) => ({ ...t, weight_kg: true }))}
                isInvalid={weightInvalid}
                errorMessage="Ingresá un peso válido (40–140 kg)."
                endContent={<span className="text-xs text-bh-fg-4">kg</span>}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
                Posición <span className="text-bh-danger">*</span>
              </span>
              <div
                className={`rounded-bh-lg border p-3 transition-colors ${
                  posInvalid ? "border-bh-danger" : "border-white/[0.08] hover:border-white/[0.18]"
                }`}
                onBlur={(e) => {
                  const next = e.relatedTarget as Node | null;
                  if (!next || !e.currentTarget.contains(next)) {
                    setTouched((t) => ({ ...t, position: true }));
                  }
                }}
              >
                <PositionPicker
                  key={`pos-${application.id}`}
                  defaultRole={form.position.role}
                  defaultSubs={form.position.subs}
                  onChange={(val) => setForm((f) => ({ ...f, position: val }))}
                />
              </div>
              {posInvalid && <p className="text-sm text-danger">Elegí al menos una sub-posición.</p>}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Nacionalidades</p>
              <div className="flex flex-wrap gap-2">
                {application.nationalities.map((n, i) => (
                  <Chip
                    key={`${n.name}-${i}`}
                    size="sm"
                    variant="faded"
                    startContent={n.code ? <CountryFlag code={n.code} size={16} /> : null}
                    className="text-default-700"
                  >
                    {n.name}
                  </Chip>
                ))}
              </div>
            </div>
            {application.positions.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Posiciones</p>
                <div className="flex flex-wrap gap-2">
                  {application.positions.map((p, i) => (
                    <Chip key={`${p}-${i}`} size="sm" variant="faded">
                      {p}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Fecha de nacimiento</p>
                <p>{formatBirthDate(application.birth_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Edad</p>
                <p>{application.age ?? "—"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Altura</p>
                <p>{application.height_cm ? `${application.height_cm} cm` : "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Peso</p>
                <p>{application.weight_kg ? `${application.weight_kg} kg` : "—"}</p>
              </div>
            </div>
            {application.kyc_docs.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-bh-fg-3 mb-1">Documentos KYC</p>
                <div className="flex gap-2">
                  {application.kyc_docs.map((doc, i) => {
                    const Icon = doc.label === "Documento" ? FileText : Camera;
                    return (
                      <a key={i} href={doc.url} target="_blank" className="text-bh-fg-3">
                        <Icon size={16} />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-bh-danger">{error}</p>}
      </ModalBody>
      <ModalFooter className={classNames?.footer}>
        {editing ? (
          <>
            <Button
              variant="flat"
              onPress={() => setEditing(false)}
              isDisabled={saving}
              className={bhButtonClass({ variant: "ghost", size: "sm" })}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleSave}
              isLoading={saving}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              Guardar
            </Button>
          </>
        ) : mode === "review" ? (
          <Button
            onPress={handleApprove}
            isLoading={approving}
            className={bhButtonClass({ variant: "lime", size: "sm", className: "ml-auto" })}
          >
            Aceptar datos
          </Button>
        ) : null}
      </ModalFooter>
    </>
  );
}
