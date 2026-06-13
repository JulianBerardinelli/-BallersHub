"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { bhButtonClass } from "@/components/ui/BhButton";
import { useForm } from "react-hook-form";
import { Lock, Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { profileNotification, useNotificationContext } from "@/modules/notifications";
import { usePlanAccess } from "@/components/dashboard/plan/PlanAccessProvider";
import UpgradeModal, { useUpgradeModal } from "@/components/dashboard/plan/UpgradeModal";

import { updateScoutingAnalysis } from "../actions";

type ScoutingAnalysisFormValues = {
  topCharacteristics: string;
  tacticsAnalysis: string;
  physicalAnalysis: string;
  mentalAnalysis: string;
  techniqueAnalysis: string;
  analysisAuthor: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: ScoutingAnalysisFormValues;
};

export default function ScoutingAnalysisSection({ playerId, initialValues }: Props) {
  const t = useTranslations("dashEditProfile");
  const [defaults, setDefaults] = useState<ScoutingAnalysisFormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();
  const { enqueue } = useNotificationContext();
  const { access } = usePlanAccess();
  const upgradeModal = useUpgradeModal();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ScoutingAnalysisFormValues>({
    defaultValues: initialValues,
  });

  useEffect(() => {
    setDefaults(initialValues);
    reset(initialValues);
  }, [initialValues, reset]);

  function handleToggleEditing() {
    if (isEditing) {
      reset(defaults);
      clearErrors();
      setStatus(null);
      setIsEditing(false);
      return;
    }

    clearErrors();
    setStatus(null);
    setIsEditing(true);
  }

  function handleCancel() {
    reset(defaults);
    clearErrors();
    setStatus(null);
    setIsEditing(false);
  }

  const onSubmit = handleSubmit((values) => {
    if (!access.isPro) {
      upgradeModal.open("advancedStats");
      return;
    }

    startTransition(async () => {
      setStatus(null);
      clearErrors();

      const result = await updateScoutingAnalysis({
        playerId,
        topCharacteristics: values.topCharacteristics,
        tacticsAnalysis: values.tacticsAnalysis,
        physicalAnalysis: values.physicalAnalysis,
        mentalAnalysis: values.mentalAnalysis,
        techniqueAnalysis: values.techniqueAnalysis,
        analysisAuthor: values.analysisAuthor,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          if (result.fieldErrors.topCharacteristics) {
            setError("topCharacteristics", { type: "server", message: result.fieldErrors.topCharacteristics });
          }
          if (result.fieldErrors.tacticsAnalysis) {
            setError("tacticsAnalysis", { type: "server", message: result.fieldErrors.tacticsAnalysis });
          }
          if (result.fieldErrors.physicalAnalysis) {
            setError("physicalAnalysis", { type: "server", message: result.fieldErrors.physicalAnalysis });
          }
          if (result.fieldErrors.mentalAnalysis) {
            setError("mentalAnalysis", { type: "server", message: result.fieldErrors.mentalAnalysis });
          }
          if (result.fieldErrors.techniqueAnalysis) {
            setError("techniqueAnalysis", { type: "server", message: result.fieldErrors.techniqueAnalysis });
          }
          if (result.fieldErrors.analysisAuthor) {
            setError("analysisAuthor", { type: "server", message: result.fieldErrors.analysisAuthor });
          }
        }

        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({
        type: "success",
        message: result.message ?? t("footballData.scouting.successDefault"),
      });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: t("footballData.scouting.sectionLabel"),
            changedFields: result.updatedFields,
            detailsHref: "/dashboard/edit-profile/football-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          {t("footballData.scouting.titleText")}
          {!access.isPro && (
            <span className="inline-flex items-center gap-1 rounded-full border border-bh-lime/40 bg-bh-lime/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-bh-lime">
              <Lock size={9} /> Pro
            </span>
          )}
        </span>
      }
      description={
        access.isPro
          ? t("footballData.scouting.descriptionPro")
          : t("footballData.scouting.descriptionFree")
      }
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? t("footballData.scouting.cancelAria") : t("footballData.scouting.editAria")}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="grid gap-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField
              key={`topCharacteristics-${defaults.topCharacteristics}`}
              id="topCharacteristics"
              label={t("footballData.scouting.topCharacteristicsLabel")}
              placeholder={t("footballData.scouting.topCharacteristicsPlaceholder")}
              readOnly={!isEditing}
              defaultValue={defaults.topCharacteristics}
              errorMessage={errors.topCharacteristics?.message}
              {...register("topCharacteristics")}
            />
          </div>

          <FormField
            key={`tacticsAnalysis-${defaults.tacticsAnalysis}`}
            as="textarea"
            id="tacticsAnalysis"
            label={t("footballData.scouting.tacticsLabel")}
            placeholder={t("footballData.scouting.tacticsPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.tacticsAnalysis}
            rows={4}
            errorMessage={errors.tacticsAnalysis?.message}
            {...register("tacticsAnalysis")}
          />

          <FormField
            key={`physicalAnalysis-${defaults.physicalAnalysis}`}
            as="textarea"
            id="physicalAnalysis"
            label={t("footballData.scouting.physicalLabel")}
            placeholder={t("footballData.scouting.physicalPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.physicalAnalysis}
            rows={4}
            errorMessage={errors.physicalAnalysis?.message}
            {...register("physicalAnalysis")}
          />

          <FormField
            key={`mentalAnalysis-${defaults.mentalAnalysis}`}
            as="textarea"
            id="mentalAnalysis"
            label={t("footballData.scouting.mentalLabel")}
            placeholder={t("footballData.scouting.mentalPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.mentalAnalysis}
            rows={4}
            errorMessage={errors.mentalAnalysis?.message}
            {...register("mentalAnalysis")}
          />

          <FormField
            key={`techniqueAnalysis-${defaults.techniqueAnalysis}`}
            as="textarea"
            id="techniqueAnalysis"
            label={t("footballData.scouting.techniqueLabel")}
            placeholder={t("footballData.scouting.techniquePlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.techniqueAnalysis}
            rows={4}
            errorMessage={errors.techniqueAnalysis?.message}
            {...register("techniqueAnalysis")}
          />

          <div className="md:col-span-2 mt-2">
            <FormField
              key={`analysisAuthor-${defaults.analysisAuthor}`}
              id="analysisAuthor"
              label={t("footballData.scouting.authorLabel")}
              placeholder={t("footballData.scouting.authorPlaceholder")}
              readOnly={!isEditing}
              defaultValue={defaults.analysisAuthor}
              errorMessage={errors.analysisAuthor?.message}
              {...register("analysisAuthor")}
            />
          </div>
        </div>

        {status ? (
          <div>
            <Chip color={status.type === "success" ? "success" : "danger"} variant="flat" className="text-sm">
              {status.message}
            </Chip>
          </div>
        ) : null}

        {isEditing ? (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={handleCancel} isDisabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isDisabled={isPending || !isDirty} isLoading={isPending} className={bhButtonClass({ variant: "lime", size: "sm" })}>
              {t("common.saveChanges")}
            </Button>
          </div>
        ) : null}
      </form>

      <UpgradeModal state={upgradeModal.state} onClose={upgradeModal.close} />
    </SectionCard>
  );
}
