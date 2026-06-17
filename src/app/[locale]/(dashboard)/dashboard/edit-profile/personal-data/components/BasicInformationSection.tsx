"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

import { updateBasicInformation } from "../actions";

type BasicInfoFormValues = {
  fullName: string;
  birthDate: string;
  nationalities: string;
  residence: string;
  heightCm: string;
  weightKg: string;
  bio: string;
  education: string;
};

const EDUCATION_MAX_LENGTH = 200;

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: BasicInfoFormValues;
  /** Raw `gender` enum value. Read-only here — set once at onboarding. */
  genderValue?: string;
  /** Override the write action (admin CRUD injects its service-role variant). */
  action?: typeof updateBasicInformation;
};

export default function BasicInformationSection({
  playerId,
  initialValues,
  genderValue,
  action = updateBasicInformation,
}: Props) {
  const t = useTranslations("dashEditProfile");

  // Gender is immutable from the dashboard, so it lives OUTSIDE react-hook-form
  // (otherwise reset() after a save would wipe the displayed value). Map the
  // raw enum to a localized label for the read-only field.
  const genderLabels: Record<string, string> = {
    male: t("personalData.basicInfo.gender_male"),
    female: t("personalData.basicInfo.gender_female"),
    unspecified: t("personalData.basicInfo.gender_unspecified"),
  };
  const genderLabel = genderLabels[genderValue ?? "male"] ?? genderLabels.male;
  const [defaults, setDefaults] = useState<BasicInfoFormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();
  const { enqueue } = useNotificationContext();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<BasicInfoFormValues>({
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
    startTransition(async () => {
      setStatus(null);
      clearErrors();

      const result = await action({
        playerId,
        fullName: defaults.fullName,
        birthDate: values.birthDate,
        nationalities: defaults.nationalities,
        residence: values.residence,
        heightCm: values.heightCm,
        weightKg: values.weightKg,
        bio: values.bio,
        education: values.education,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof BasicInfoFormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? t("personalData.basicInfo.successDefault") });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: t("personalData.basicInfo.sectionLabel"),
            changedFields: result.updatedFields,
            userName: result.data.fullName || undefined,
            detailsHref: "/dashboard/edit-profile/personal-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title={t("personalData.basicInfo.title")}
      description={t("personalData.basicInfo.description")}
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? t("personalData.basicInfo.cancelAria") : t("personalData.basicInfo.editAria")}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="grid gap-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`fullName-${defaults.fullName}`}
            id="full_name"
            label={t("personalData.basicInfo.fullNameLabel")}
            readOnly
            defaultValue={defaults.fullName}
            errorMessage={errors.fullName?.message}
            {...register("fullName")}
          />
          <FormField
            key={`birthDate-${defaults.birthDate}`}
            id="birth_date"
            label={t("personalData.basicInfo.birthDateLabel")}
            placeholder={t("personalData.basicInfo.birthDatePlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.birthDate}
            errorMessage={errors.birthDate?.message}
            {...register("birthDate")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="gender"
            label={t("personalData.basicInfo.genderLabel")}
            description={t("personalData.basicInfo.genderImmutableNote")}
            readOnly
            value={genderLabel}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`nationalities-${defaults.nationalities}`}
            id="nationality"
            label={t("personalData.basicInfo.nationalitiesLabel")}
            placeholder={t("personalData.basicInfo.nationalitiesPlaceholder")}
            readOnly
            defaultValue={defaults.nationalities}
            errorMessage={errors.nationalities?.message}
            {...register("nationalities")}
          />
          <FormField
            key={`residence-${defaults.residence}`}
            id="residence"
            label={t("personalData.basicInfo.residenceLabel")}
            placeholder={t("personalData.basicInfo.residencePlaceholder")}
            description={t("personalData.basicInfo.residenceDescription")}
            readOnly={!isEditing}
            defaultValue={defaults.residence}
            errorMessage={errors.residence?.message}
            {...register("residence")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`height-${defaults.heightCm}`}
            id="height_cm"
            label={t("personalData.basicInfo.heightLabel")}
            placeholder={t("personalData.basicInfo.heightPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.heightCm}
            errorMessage={errors.heightCm?.message}
            {...register("heightCm")}
          />
          <FormField
            key={`weight-${defaults.weightKg}`}
            id="weight_kg"
            label={t("personalData.basicInfo.weightLabel")}
            placeholder={t("personalData.basicInfo.weightPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.weightKg}
            errorMessage={errors.weightKg?.message}
            {...register("weightKg")}
          />
        </div>
        <FormField
          key={`bio-${defaults.bio}`}
          id="bio"
          as="textarea"
          rows={4}
          label={t("personalData.basicInfo.bioLabel")}
          placeholder={t("personalData.basicInfo.bioPlaceholder")}
          readOnly={!isEditing}
          defaultValue={defaults.bio}
          errorMessage={errors.bio?.message}
          {...register("bio")}
        />
        <FormField
          key={`education-${defaults.education}`}
          id="education"
          label={t("personalData.basicInfo.educationLabel")}
          placeholder={t("personalData.basicInfo.educationPlaceholder")}
          description={t("personalData.basicInfo.educationDescription", { max: EDUCATION_MAX_LENGTH })}
          maxLength={EDUCATION_MAX_LENGTH}
          readOnly={!isEditing}
          defaultValue={defaults.education}
          errorMessage={errors.education?.message}
          {...register("education", {
            maxLength: {
              value: EDUCATION_MAX_LENGTH,
              message: t("personalData.basicInfo.educationMaxError", { max: EDUCATION_MAX_LENGTH }),
            },
          })}
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
          <div className="flex flex-col gap-3 border-t border-neutral-900 pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={handleCancel} isDisabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              color="primary"
              type="submit"
              isDisabled={isPending || !isDirty}
              isLoading={isPending}
            >
              {t("common.saveChanges")}
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
