"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  DatePicker,
  Button,
  Select,
  SelectItem,
} from "@heroui/react";
import PositionPicker, { type PositionPickerValue } from "@/components/common/PositionPicker";
import CountryMultiPicker, { type CountryPick } from "@/components/common/CountryMultiPicker";
import FormField from "@/components/dashboard/client/FormField";
import { bhDatePickerClassNames, bhSelectClassNames } from "@/lib/ui/heroui-brand";

const minChars = (v: string, n = 3) => (v?.trim()?.length ?? 0) >= n;
type AnyDateValue = any;
// Mirrors the DB `gender` enum (src/db/schema/enums.ts). Kept as a local
// literal union so this client component doesn't pull the Drizzle schema
// into the browser bundle.
type Gender = "male" | "female" | "unspecified";
const GENDER_OPTIONS: Gender[] = ["male", "female", "unspecified"];

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
    gender: Gender;
    position: PositionPickerValue;
    heightCm: number | null;
    weightKg: number | null;
  }) => void;
  onBack?: () => void;
}) {
  const t = useTranslations("onboarding");
  // estado
  const [fullName, setFullName] = React.useState("");
  const [nats, setNats] = React.useState<CountryPick[]>([]);
  const [birthDate, setBirthDate] = React.useState<AnyDateValue | null>(null);
  // Defaults to "male" per product spec (zero-friction for the common case;
  // women explicitly pick "female"). Always has a value, so it's never invalid.
  const [gender, setGender] = React.useState<Gender>("male");
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
      gender,
      position,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
    });
  }
  function handlePosWrapperBlur(e: React.FocusEvent<HTMLDivElement>) {
    // Marca touched SOLO si el foco realmente salió del contenedor
    const next = e.relatedTarget as Node | null;
    if (!next || !e.currentTarget.contains(next)) {
      setTouched((prev) => ({ ...prev, position: true }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid min-h-[560px] grid-cols-1 gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        {/* email + nombre */}
        <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
          <FormField
            id="bh-email"
            label={t("apply.step1.emailLabel")}
            value={userEmail ?? ""}
            disabled
            readOnly
            description={t("apply.step1.emailDescription")}
          />
          <FormField
            id="bh-full-name"
            isRequired
            label={t("apply.step1.fullNameLabel")}
            placeholder={t("apply.step1.fullNamePlaceholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            isInvalid={nameInvalid}
            errorMessage={t("apply.step1.fullNameError")}
            onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
          />
        </div>

        {/* nacionalidades */}
        <div
            onBlurCapture={() => setTouched((t) => ({ ...t, nationalities: true }))}
            className="grid auto-rows-fr gap-3 grid-cols-1">
          <CountryMultiPicker
            defaultValue={[]}
            onChange={setNats}
            isInvalid={natInvalid}
            errorMessage={t("apply.step1.nationalityError")}
          />
        </div>

        {/* fecha de nacimiento + género */}
        <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
          <DatePicker
            isRequired
            label={t("apply.step1.birthDateLabel")}
            labelPlacement="outside"
            showMonthAndYearPickers
            value={birthDate}
            onChange={(v) => {
              setBirthDate(v);
              setTouched((prev) => ({ ...prev, birthDate: true }));
            }}
            isInvalid={dobInvalid}
            errorMessage={t("apply.step1.birthDateError")}
            variant="flat"
            classNames={bhDatePickerClassNames}
          />
          <Select
            isRequired
            label={t("apply.step1.genderLabel")}
            labelPlacement="outside"
            variant="flat"
            disallowEmptySelection
            selectedKeys={[gender]}
            onSelectionChange={(keys) => {
              const next = Array.from(keys)[0] as Gender | undefined;
              if (next) setGender(next);
            }}
            description={t("apply.step1.genderDescription")}
            classNames={bhSelectClassNames}
          >
            {GENDER_OPTIONS.map((value) => (
              <SelectItem key={value}>{t(`apply.step1.gender_${value}`)}</SelectItem>
            ))}
          </Select>
        </div>

        {/* medidas arriba de posición */}
        <div className="grid auto-rows-fr gap-3 grid-cols-2">
          <FormField
            id="bh-height"
            isRequired
            type="number"
            label={t("apply.step1.heightLabel")}
            placeholder={t("apply.step1.heightPlaceholder")}
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, height: true }))}
            isInvalid={heightInvalid}
            errorMessage={t("apply.step1.heightError")}
            endContent={<span className="text-xs">cm</span>}
          />
          <FormField
            id="bh-weight"
            isRequired
            type="number"
            label={t("apply.step1.weightLabel")}
            placeholder={t("apply.step1.weightPlaceholder")}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, weight: true }))}
            isInvalid={weightInvalid}
            errorMessage={t("apply.step1.weightError")}
            endContent={<span className="text-xs">kg</span>}
          />
        </div>

        {/* posición */}
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
            {t("apply.step1.positionLabel")} <span className="text-bh-danger">*</span>
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
              {t("apply.step1.positionError")}
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
            {t("apply.step1.back")}
          </Button>
        )}
        <Button
          onPress={handleNext}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          {t("apply.step1.continue")}
        </Button>
      </div>
    </div>
  );
}
