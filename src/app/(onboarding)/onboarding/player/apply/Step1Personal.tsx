"use client";

import * as React from "react";
import {
  Form,
  DatePicker,
  Button,
} from "@heroui/react";
import PositionPicker, { type PositionPickerValue } from "@/components/common/PositionPicker";
import CountryMultiPicker, { type CountryPick } from "@/components/common/CountryMultiPicker";
import FormField from "@/components/dashboard/client/FormField";
import { bhDatePickerClassNames } from "@/lib/ui/heroui-brand";

const minChars = (v: string, n = 3) => (v?.trim()?.length ?? 0) >= n;
type AnyDateValue = any;

export default function Step1Personal({
  userEmail,
  onNext,
  onBack,
}: {
  userEmail: string | null;
  onNext: (data: {
    fullName: string;
    nationalities: CountryPick[];
    birthDate: AnyDateValue | null;
    position: PositionPickerValue;
    heightCm: number | null;
    weightKg: number | null;
  }) => void;
  onBack?: () => void;
}) {
  // estado
  const [fullName, setFullName] = React.useState("");
  const [nats, setNats] = React.useState<CountryPick[]>([]);
  const [birthDate, setBirthDate] = React.useState<AnyDateValue | null>(null);
  const [position, setPosition] = React.useState<PositionPickerValue>({ role: "DEL", subs: [] });
  const [heightCm, setHeightCm] = React.useState<string>("");
  const [weightKg, setWeightKg] = React.useState<string>("");

  // touched para mostrar errores solo cuando corresponde
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // parsers + reglas
  const hVal = heightCm ? Number(heightCm) : NaN;
  const wVal = weightKg ? Number(weightKg) : NaN;

  const nameInvalid = !!touched.fullName && !minChars(fullName);
  const natInvalid  = !!touched.nationalities && nats.length < 1;
  const dobInvalid  = !!touched.birthDate && !birthDate;

  // Reglas: altura [120..230], peso [40..140], ambos requeridos
  const heightInvalid = !!touched.height && !(Number.isFinite(hVal) && hVal >= 120 && hVal <= 230);
  const weightInvalid = !!touched.weight && !(Number.isFinite(wVal) && wVal >= 40 && wVal <= 140);

  // Posición: al menos 1 subposición
  const posInvalid = !!touched.position && position.subs.length < 1;

  const stepValid =
    minChars(fullName) &&
    nats.length >= 1 &&
    !!birthDate &&
    Number.isFinite(hVal) && hVal >= 120 && hVal <= 230 &&
    Number.isFinite(wVal) && wVal >= 40 && wVal <= 140 &&
    position.subs.length >= 1;

  function handleNext() {
    setTouched({
      fullName: true,
      nationalities: true,
      birthDate: true,
      height: true,
      weight: true,
      position: true,
    });
    if (!stepValid) return;
    onNext({
      fullName,
      nationalities: nats,
      birthDate,
      position,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
    });
  }
  function handlePosWrapperBlur(e: React.FocusEvent<HTMLDivElement>) {
    // Marca touched SOLO si el foco realmente salió del contenedor
    const next = e.relatedTarget as Node | null;
    if (!next || !e.currentTarget.contains(next)) {
      setTouched((t) => ({ ...t, position: true }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid min-h-[560px] gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        {/* email + nombre */}
        <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <FormField
            id="bh-email"
            label="Email de la cuenta"
            value={userEmail ?? ""}
            disabled
            readOnly
            description="Este es tu email de acceso"
          />
          <FormField
            id="bh-full-name"
            isRequired
            label="Nombre completo"
            placeholder="Ej: Lionel Messi"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            isInvalid={nameInvalid}
            errorMessage="Ingresá al menos 3 caracteres."
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
          />
        </div>

        {/* nacionalidades + fecha */}
        <div
            onBlurCapture={() => setTouched((t) => ({ ...t, nationalities: true }))}
            className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          <CountryMultiPicker
            defaultValue={[]}
            onChange={setNats}
            isInvalid={natInvalid}
            errorMessage="Seleccioná al menos una nacionalidad."
          />
          <DatePicker
            isRequired
            label="Fecha de nacimiento"
            labelPlacement="outside"
            showMonthAndYearPickers
            value={birthDate}
            onChange={(v) => {
              setBirthDate(v);
              setTouched((t) => ({ ...t, birthDate: true }));
            }}
            isInvalid={dobInvalid}
            errorMessage="Seleccioná tu fecha de nacimiento."
            variant="flat"
            classNames={bhDatePickerClassNames}
          />
        </div>

        {/* medidas arriba de posición */}
        <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <FormField
            id="bh-height"
            isRequired
            type="number"
            label="Altura (cm)"
            placeholder="ej: 178"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, height: true }))}
            isInvalid={heightInvalid}
            errorMessage="Ingresá una altura válida (120–230 cm)."
            endContent={<span className="text-xs">cm</span>}
          />
          <FormField
            id="bh-weight"
            isRequired
            type="number"
            label="Peso (kg)"
            placeholder="ej: 72"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, weight: true }))}
            isInvalid={weightInvalid}
            errorMessage="Ingresá un peso válido (40–140 kg)."
            endContent={<span className="text-xs">kg</span>}
          />
        </div>

        {/* posición */}
        <div className="grid gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
            Posición <span className="text-bh-danger">*</span>
          </label>

          <div
            className={[
              "rounded-bh-lg border p-3 transition-colors",
              posInvalid
                ? "border-bh-danger"
                : "border-white/[0.08] hover:border-white/[0.18]",
            ].join(" ")}
            onBlur={handlePosWrapperBlur}
          >
            <PositionPicker
              defaultRole="DEL"
              defaultSubs={[]}
              onChange={(val) => {
                setPosition(val);
              }}
            />
          </div>

          {posInvalid && (
            <p className="text-[11px] text-bh-danger">
              Elegí al menos una sub-posición.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onBack && (
          <Button
            variant="flat"
            onPress={onBack}
            className="rounded-bh-md border border-bh-fg-4 bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Volver
          </Button>
        )}
        <Button
          onPress={handleNext}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
