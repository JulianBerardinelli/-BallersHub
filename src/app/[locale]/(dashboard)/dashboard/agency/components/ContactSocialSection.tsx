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

type ContactValues = {
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  verifiedLink: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  agencyName: string;
  initialValues: ContactValues;
};

export default function ContactSocialSection({ agencyId, agencyName, initialValues }: Props) {
  const t = useTranslations("dashAgency");
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<ContactValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ContactValues>({ defaultValues: initialValues });

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
        const trimmed = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, (v ?? "").trim() || null]),
        ) as Record<keyof ContactValues, string | null>;

        await updateAgencyProfile(agencyId, trimmed);
        const next = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, (v ?? "").trim()]),
        ) as ContactValues;
        setDefaults(next);
        reset(next);
        setIsEditing(false);
        setStatus({ type: "success", message: t("contact.successUpdated") });
        enqueue(
          profileNotification.updated({
            userName: agencyName,
            sectionLabel: t("contact.notificationSection"),
            changedFields: [t("contact.fieldEmail"), t("contact.fieldPhone"), t("contact.fieldSocial")],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : t("contact.errorSave"),
        });
      }
    });
  });

  return (
    <SectionCard
      title={t("contact.title")}
      description={t("contact.description")}
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel={t("contact.ariaLabel")}
        />
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`email-${defaults.contactEmail}`}
            label={t("contact.emailLabel")}
            type="email"
            placeholder={t("contact.emailPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.contactEmail}
            {...register("contactEmail")}
          />
          <FormField
            key={`phone-${defaults.contactPhone}`}
            label={t("contact.phoneLabel")}
            type="tel"
            placeholder={t("contact.phonePlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.contactPhone}
            {...register("contactPhone")}
          />
          <FormField
            key={`web-${defaults.websiteUrl}`}
            label={t("contact.websiteLabel")}
            type="url"
            placeholder={t("contact.websitePlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.websiteUrl}
            {...register("websiteUrl")}
          />
          <FormField
            key={`verified-${defaults.verifiedLink}`}
            label={t("contact.verifiedLabel")}
            type="url"
            placeholder={t("contact.verifiedPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.verifiedLink}
            {...register("verifiedLink")}
          />
          <FormField
            key={`ig-${defaults.instagramUrl}`}
            label={t("contact.instagramLabel")}
            type="url"
            placeholder={t("contact.instagramPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.instagramUrl}
            {...register("instagramUrl")}
          />
          <FormField
            key={`tw-${defaults.twitterUrl}`}
            label={t("contact.twitterLabel")}
            type="url"
            placeholder={t("contact.twitterPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.twitterUrl}
            {...register("twitterUrl")}
          />
          <FormField
            key={`li-${defaults.linkedinUrl}`}
            label={t("contact.linkedinLabel")}
            type="url"
            placeholder={t("contact.linkedinPlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.linkedinUrl}
            {...register("linkedinUrl")}
          />
        </div>

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
              {t("contact.saveButton")}
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
