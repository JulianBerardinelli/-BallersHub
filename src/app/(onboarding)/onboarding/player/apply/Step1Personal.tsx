"use client";

import * as React from "react";
import {
  Form,
  Input,
  DatePicker,
  Button,
} from "@heroui/react";
import PositionPicker, { type PositionPickerValue } from "@/components/common/PositionPicker";
import CountryMultiPicker, { type CountryPick } from "@/components/common/CountryMultiPicker";

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
      <div className="grid gap-4 rounded-xl border p-4 min-h-[560px]">
        {/* email + nombre */}
        <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Input
            label="Email de la cuenta"
            labelPlacement="outside"
            value={userEmail ?? ""}
            isDisabled
            description="Este es tu email de acceso"
            classNames={{ description: "text-foreground-500" }}
          />
          <Input
            isRequired
            label="Nombre completo"
            labelPlacement="outside"
            placeholder="Ej: Lionel Messi"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            isInvalid={nameInvalid}
            errorMessage="Ingresá al menos 3 caracteres."
            classNames={{ description: "text-foreground-500" }}
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
            classNames={{ description: "text-foreground-500" }}
          />
        </div>

        {/* medidas arriba de posición */}
        <div className="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          <Input
            isRequired
            type="number"
            label="Altura (cm)"
            labelPlacement="outside"
            placeholder="ej: 178"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, height: true }))}
            isInvalid={heightInvalid}
            errorMessage="Ingresá una altura válida (120–230 cm)."
            endContent={<span className="text-xs text-foreground-500">cm</span>}
            classNames={{ description: "text-foreground-500" }}
          />
          <Input
            isRequired
            type="number"
            label="Peso (kg)"
            labelPlacement="outside"
            placeholder="ej: 72"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, weight: true }))}
            isInvalid={weightInvalid}
            errorMessage="Ingresá un peso válido (40–140 kg)."
            endContent={<span className="text-xs text-foreground-500">kg</span>}
            classNames={{ description: "text-foreground-500" }}
          />
        </div>

        {/* posición: envolvemos el picker para mostrar error por fuera */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Posición <span className="text-danger">*</span>
          </label>

          <div
            className={[
              "rounded-2xl border p-3",
              posInvalid ? "border-danger" : "border-default",
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
            <p className="text-sm text-danger">
              Elegí al menos una sub-posición.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onBack && <Button variant="flat" onPress={onBack}>Volver</Button>}
        <Button color="primary" onPress={handleNext}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
