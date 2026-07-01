"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DatePicker, Button, Select, SelectItem, SelectSection } from "@heroui/react";
import CountryMultiPicker, { type CountryPick } from "@/components/common/CountryMultiPicker";
import FormField from "@/components/dashboard/client/FormField";
import { bhDatePickerClassNames, bhSelectClassNames } from "@/lib/ui/heroui-brand";
import {
  STAFF_ROLES,
  STAFF_ROLE_GROUPS,
  MAX_SECONDARY_ROLES,
  isStaffRole,
  type StaffRoleType,
} from "@/lib/staff/roles";

const minChars = (v: string, n = 3) => (v?.trim()?.length ?? 0) >= n;
type AnyDateValue = any;

export type Step1Data = {
  fullName: string;
  nationalities: CountryPick[];
  birthDate: AnyDateValue | null;
  roleTitle: string;
  // Roles estructurados (staff): 1 principal (req) + hasta 2 secundarios.
  primaryRole: StaffRoleType | null;
  secondaryRoles: StaffRoleType[];
};

export default function Step1Identity({
  userEmail,
  defaultValue,
  onNext,
  onBack,
}: {
  userEmail: string | null;
  defaultValue?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
  onBack?: () => void;
}) {
  const t = useTranslations("onboarding");
  const tStaff = useTranslations("staff");
  const tRole = tStaff as unknown as (key: string) => string;

  // estado
  const [fullName, setFullName] = React.useState(defaultValue?.fullName ?? "");
  const [nats, setNats] = React.useState<CountryPick[]>(defaultValue?.nationalities ?? []);
  const [birthDate, setBirthDate] = React.useState<AnyDateValue | null>(defaultValue?.birthDate ?? null);
  const [roleTitle, setRoleTitle] = React.useState<string>(defaultValue?.roleTitle ?? "");
  const [primaryRole, setPrimaryRole] = React.useState<StaffRoleType | null>(
    defaultValue?.primaryRole ?? null,
  );
  const [secondaryRoles, setSecondaryRoles] = React.useState<StaffRoleType[]>(
    defaultValue?.secondaryRoles ?? [],
  );

  // touched para mostrar errores solo cuando corresponde
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  // reglas
  const nameInvalid = !!touched.fullName && !minChars(fullName);
  const natInvalid = !!touched.nationalities && nats.length < 1;
  const dobInvalid = !!touched.birthDate && !birthDate;
  const primaryRoleInvalid = !!touched.primaryRole && !primaryRole;

  const stepValid =
    minChars(fullName) && nats.length >= 1 && !!birthDate && !!primaryRole;

  function handleNext() {
    setTouched({
      fullName: true,
      nationalities: true,
      birthDate: true,
      primaryRole: true,
    });
    if (!stepValid) return;
    onNext({
      fullName,
      nationalities: nats,
      birthDate,
      roleTitle: roleTitle.trim(),
      primaryRole,
      secondaryRoles,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid min-h-[480px] grid-cols-1 gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
        {/* email + nombre */}
        <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
          <FormField
            id="bh-email"
            label={t("coachApply.step1.emailLabel")}
            value={userEmail ?? ""}
            disabled
            readOnly
            description={t("coachApply.step1.emailDescription")}
          />
          <FormField
            id="bh-full-name"
            isRequired
            label={t("coachApply.step1.fullNameLabel")}
            placeholder={t("coachApply.step1.fullNamePlaceholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            isInvalid={nameInvalid}
            errorMessage={t("coachApply.step1.fullNameError")}
            onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
          />
        </div>

        {/* nacionalidades + fecha */}
        <div
          onBlurCapture={() => setTouched((t) => ({ ...t, nationalities: true }))}
          className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2"
        >
          <CountryMultiPicker
            defaultValue={defaultValue?.nationalities ?? []}
            onChange={setNats}
            isInvalid={natInvalid}
            errorMessage={t("coachApply.step1.nationalityError")}
          />
          <DatePicker
            isRequired
            label={t("coachApply.step1.birthDateLabel")}
            labelPlacement="outside"
            showMonthAndYearPickers
            value={birthDate}
            onChange={(v) => {
              setBirthDate(v);
              setTouched((prev) => ({ ...prev, birthDate: true }));
            }}
            isInvalid={dobInvalid}
            errorMessage={t("coachApply.step1.birthDateError")}
            variant="flat"
            classNames={bhDatePickerClassNames}
          />
        </div>

        {/* Roles del staff: principal (req) + hasta 2 secundarios. Label custom
            ARRIBA (no `labelPlacement="outside"` de HeroUI, que en este grid se
            encimaba con el placeholder); aria-label cubre la accesibilidad. */}
        <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bh-primary-role"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2"
            >
              {t("coachApply.step1.primaryRoleLabel")} <span className="text-bh-danger">*</span>
            </label>
            <Select
              id="bh-primary-role"
              aria-label={t("coachApply.step1.primaryRoleLabel")}
              variant="flat"
              placeholder={t("coachApply.step1.primaryRolePlaceholder")}
              selectedKeys={primaryRole ? [primaryRole] : []}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                const role = isStaffRole(next) ? next : null;
                setPrimaryRole(role);
                setSecondaryRoles((prev) => prev.filter((r) => r !== role));
                setTouched((p) => ({ ...p, primaryRole: true }));
              }}
              isInvalid={primaryRoleInvalid}
              errorMessage={t("coachApply.step1.primaryRoleError")}
              classNames={bhSelectClassNames}
            >
              {STAFF_ROLE_GROUPS.map((g) => (
                <SelectSection key={g.id} title={tRole(`groups.${g.id}`)}>
                  {g.roles.map((r) => (
                    <SelectItem key={r}>{tRole(`roles.${r}`)}</SelectItem>
                  ))}
                </SelectSection>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bh-secondary-roles"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2"
            >
              {t("coachApply.step1.secondaryRolesLabel")} <span className="normal-case text-bh-fg-4">{t("coachApply.step1.secondaryRolesHint")}</span>
            </label>
            <Select
              id="bh-secondary-roles"
              aria-label={t("coachApply.step1.secondaryRolesLabel")}
              variant="flat"
              selectionMode="multiple"
              placeholder={t("coachApply.step1.secondaryRolesPlaceholder")}
              selectedKeys={secondaryRoles}
              disabledKeys={primaryRole ? [primaryRole] : []}
              onSelectionChange={(keys) => {
                const arr = Array.from(keys)
                  .filter(isStaffRole)
                  .filter((r) => r !== primaryRole)
                  .slice(0, MAX_SECONDARY_ROLES);
                setSecondaryRoles(arr);
              }}
              classNames={bhSelectClassNames}
            >
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r}>{tRole(`roles.${r}`)}</SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Título específico (opcional) — ex cargo libre, va a role_title. */}
        <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
          <FormField
            id="bh-role-title"
            label={t("coachApply.step1.roleTitleLabel")}
            placeholder={t("coachApply.step1.roleTitlePlaceholder")}
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onBack && (
          <Button
            variant="flat"
            onPress={onBack}
            className="rounded-bh-md border border-bh-fg-4 bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            {t("coachApply.step1.back")}
          </Button>
        )}
        <Button
          onPress={handleNext}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)]"
        >
          {t("coachApply.step1.continue")}
        </Button>
      </div>
    </div>
  );
}
