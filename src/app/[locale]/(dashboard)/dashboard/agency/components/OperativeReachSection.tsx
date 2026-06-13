"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import SectionCard from "@/components/dashboard/client/SectionCard";
import CountryFlag from "@/components/common/CountryFlag";
import CountryMultiPicker, { type CountryPick } from "@/components/common/CountryMultiPicker";
import EditPencilButton from "./EditPencilButton";
import { updateAgencyProfile } from "@/app/actions/agencies";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";

const COUNTRIES_MAX = 10;

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  agencyName: string;
  initialCountries: string[];
};

export default function OperativeReachSection({ agencyId, agencyName, initialCountries }: Props) {
  const t = useTranslations("dashAgency");
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<string[]>(initialCountries);
  const [countries, setCountries] = useState<string[]>(initialCountries);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });

  useEffect(() => {
    setDefaults(initialCountries);
    setCountries(initialCountries);
  }, [initialCountries]);

  const isDirty =
    countries.length !== defaults.length ||
    countries.some((c, i) => c !== defaults[i]);

  const onCancel = () => {
    setCountries(defaults);
    setIsEditing(false);
    setStatus(null);
  };

  const onSave = () => {
    startTransition(async () => {
      setStatus(null);
      try {
        await updateAgencyProfile(agencyId, { operativeCountries: countries });
        setDefaults(countries);
        setIsEditing(false);
        setStatus({ type: "success", message: t("reach.successUpdated") });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: t("reach.notificationSection"),
            changedFields: [t("reach.fieldCountries")],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : t("reach.errorSave"),
        });
      }
    });
  };

  const initialCountryPicks: CountryPick[] = defaults.map((code) => ({
    code,
    name: dnEs.of(code) ?? code,
  }));

  return (
    <SectionCard
      title={t("reach.title")}
      description={t("reach.description")}
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel={t("reach.ariaLabel")}
        />
      }
    >
      <div className="space-y-4">
        {isEditing ? (
          <>
            <CountryMultiPicker
              max={COUNTRIES_MAX}
              defaultValue={initialCountryPicks}
              onChange={(picks) => setCountries(picks.map((p) => p.code))}
              label={null}
            />
            <p className="text-[11px] text-bh-fg-4">
              {t("reach.maxHint", { max: COUNTRIES_MAX })}
            </p>
          </>
        ) : countries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-bh-surface-1/40 py-6 text-center text-sm text-bh-fg-4">
            {t("reach.empty")}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {countries.map((code) => (
              <div
                key={code}
                className="flex items-center gap-2 rounded-md border border-white/[0.10] bg-bh-surface-1/60 px-3 py-1.5 text-sm text-bh-fg-1"
              >
                <CountryFlag code={code} size={16} />
                <span>{dnEs.of(code) ?? code}</span>
              </div>
            ))}
          </div>
        )}

        {status ? (
          <div>
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          </div>
        ) : null}

        {isEditing && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={onCancel} isDisabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              onPress={onSave}
              isDisabled={isPending || !isDirty}
              isLoading={isPending}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              {t("reach.saveButton")}
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
