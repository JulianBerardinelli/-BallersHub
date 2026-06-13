"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import EditPencilButton from "./EditPencilButton";
import { updateAgencyProfile } from "@/app/actions/agencies";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";

type GeneralValues = {
  headquarters: string;
  foundationYear: string;
  description: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  agencyName: string;
  initialValues: GeneralValues;
};

export default function GeneralInfoSection({ agencyId, agencyName, initialValues }: Props) {
  const t = useTranslations("dashAgency");
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<GeneralValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GeneralValues>({ defaultValues: initialValues });

  useEffect(() => {
    setDefaults(initialValues);
    reset(initialValues);
  }, [initialValues, reset]);

  const onCancel = () => {
    reset(defaults);
    setIsEditing(false);
    setStatus(null);
  };

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setStatus(null);
      try {
        const yearTrimmed = values.foundationYear.trim();
        const yearParsed = yearTrimmed ? parseInt(yearTrimmed, 10) : null;
        if (yearParsed !== null && (Number.isNaN(yearParsed) || yearParsed < 1800 || yearParsed > currentYear)) {
          setStatus({
            type: "error",
            message: t("generalInfo.yearError", { max: currentYear }),
          });
          return;
        }

        await updateAgencyProfile(agencyId, {
          headquarters: values.headquarters.trim() || null,
          foundationYear: yearParsed,
          description: values.description.trim() || null,
        });

        setDefaults(values);
        reset(values);
        setIsEditing(false);
        setStatus({ type: "success", message: t("generalInfo.successUpdated") });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: t("generalInfo.notificationSection"),
            changedFields: [t("generalInfo.fieldHq"), t("generalInfo.fieldFoundation"), t("generalInfo.fieldDescription")],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : t("generalInfo.errorSave"),
        });
      }
    });
  });

  return (
    <SectionCard
      title={t("generalInfo.title")}
      description={t("generalInfo.description")}
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel={t("generalInfo.ariaLabel")}
        />
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`hq-${defaults.headquarters}`}
            id="agency_hq"
            label={t("generalInfo.hqLabel")}
            placeholder={t("generalInfo.hqPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.headquarters}
            {...register("headquarters")}
          />
          <FormField
            key={`year-${defaults.foundationYear}`}
            id="agency_foundation_year"
            type="number"
            label={t("generalInfo.yearLabel")}
            placeholder={t("generalInfo.yearPlaceholder")}
            readOnly={!isEditing}
            min={1800}
            max={currentYear}
            defaultValue={defaults.foundationYear}
            {...register("foundationYear")}
            isInvalid={Boolean(errors.foundationYear)}
          />
        </div>

        <FormField
          key={`desc-${defaults.description}`}
          id="agency_description"
          as="textarea"
          rows={6}
          label={t("generalInfo.aboutLabel")}
          placeholder={t("generalInfo.aboutPlaceholder")}
          readOnly={!isEditing}
          defaultValue={defaults.description}
          description={t("generalInfo.aboutDescription")}
          maxLength={4000}
          {...register("description")}
        />

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

        {isEditing ? (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={onCancel} isDisabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              isDisabled={isPending || !isDirty}
              isLoading={isPending}
              className={bhButtonClass({ variant: "lime", size: "sm" })}
            >
              {t("generalInfo.saveButton")}
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
