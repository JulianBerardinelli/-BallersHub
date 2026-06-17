"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { Pencil, X, Eye, EyeOff } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { BhCheckbox } from "@/components/ui/BhCheckbox";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

import { updateContactInformation } from "../actions";

type ContactFormValues = {
  email: string;
  phone: string;
  languages: string;
  documents: string;
  documentCountry: string;
  whatsapp: string;
  showContactSection: boolean;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: ContactFormValues;
  /** Override the write action (admin CRUD injects its service-role variant). */
  action?: typeof updateContactInformation;
};

export default function ContactInformationSection({
  playerId,
  initialValues,
  action = updateContactInformation,
}: Props) {
  const t = useTranslations("dashEditProfile");
  const [defaults, setDefaults] = useState<ContactFormValues>(initialValues);
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
    control,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues>({
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
        ...values,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof ContactFormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? t("personalData.contactInfo.successDefault") });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: t("personalData.contactInfo.sectionLabel"),
            changedFields: result.updatedFields,
            detailsHref: "/dashboard/edit-profile/personal-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title={t("personalData.contactInfo.title")}
      description={t("personalData.contactInfo.description")}
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? t("personalData.contactInfo.cancelAria") : t("personalData.contactInfo.editAria")}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`email-${defaults.email}`}
            id="email"
            label={t("personalData.contactInfo.emailLabel")}
            description={t("personalData.contactInfo.emailDescription")}
            readOnly={!isEditing}
            defaultValue={defaults.email}
            errorMessage={errors.email?.message}
            {...register("email")}
          />
          <FormField
            key={`phone-${defaults.phone}`}
            id="phone"
            label={t("personalData.contactInfo.phoneLabel")}
            placeholder={t("personalData.contactInfo.phonePlaceholder")}
            description={t("personalData.contactInfo.phoneDescription")}
            readOnly={!isEditing}
            defaultValue={defaults.phone}
            errorMessage={errors.phone?.message}
            {...register("phone")}
          />
          <FormField
            key={`whatsapp-${defaults.whatsapp}`}
            id="whatsapp"
            label={t("personalData.contactInfo.whatsappLabel")}
            placeholder={t("personalData.contactInfo.whatsappPlaceholder")}
            description={t("personalData.contactInfo.whatsappDescription")}
            readOnly={!isEditing}
            defaultValue={defaults.whatsapp}
            errorMessage={errors.whatsapp?.message}
            {...register("whatsapp")}
          />
          <FormField
            key={`languages-${defaults.languages}`}
            id="languages"
            label={t("personalData.contactInfo.languagesLabel")}
            placeholder={t("personalData.contactInfo.languagesPlaceholder")}
            description={t("personalData.contactInfo.languagesDescription")}
            readOnly={!isEditing}
            defaultValue={defaults.languages}
            errorMessage={errors.languages?.message}
            {...register("languages")}
          />
          <FormField
            key={`documents-${defaults.documents}`}
            id="documents"
            label={t("personalData.contactInfo.documentsLabel")}
            placeholder={t("personalData.contactInfo.documentsPlaceholder")}
            description={t("personalData.contactInfo.documentsDescription")}
            readOnly={!isEditing}
            defaultValue={defaults.documents}
            errorMessage={errors.documents?.message}
            {...register("documents")}
          />
          <FormField
            key={`documentCountry-${defaults.documentCountry}`}
            id="document_country"
            label={t("personalData.contactInfo.documentCountryLabel")}
            placeholder={t("personalData.contactInfo.documentCountryPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.documentCountry}
            errorMessage={errors.documentCountry?.message}
            {...register("documentCountry")}
          />
        </div>

        <Controller
          control={control}
          name="showContactSection"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4">
              <div className="flex-1">
                <BhCheckbox
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!isEditing}
                >
                  <span className="text-bh-fg-1 font-medium">
                    {t("personalData.contactInfo.showContactToggle")}
                  </span>
                </BhCheckbox>
                <p className="mt-1.5 ml-6 text-[11px] leading-[1.55] text-bh-fg-4">
                  {t("personalData.contactInfo.showContactHelp")}
                </p>
              </div>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  field.value
                    ? "bg-bh-lime/15 text-bh-lime"
                    : "bg-white/[0.05] text-bh-fg-3",
                ].join(" ")}
              >
                {field.value ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                {field.value ? t("personalData.contactInfo.visible") : t("personalData.contactInfo.hidden")}
              </span>
            </div>
          )}
        />

        <div>
          {status ? (
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          ) : null}
        </div>

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
