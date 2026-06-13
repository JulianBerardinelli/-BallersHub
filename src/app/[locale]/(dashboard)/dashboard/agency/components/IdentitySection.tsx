"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip } from "@heroui/react";
import { useForm } from "react-hook-form";
import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import AgencyLogoUploader from "@/components/dashboard/manager/AgencyLogoUploader";
import EditPencilButton from "./EditPencilButton";
import { updateAgencyProfile } from "@/app/actions/agencies";
import { useNotificationContext, profileNotification } from "@/modules/notifications";
import { bhButtonClass } from "@/components/ui/bh-button-class";

type IdentityValues = {
  name: string;
  slug: string;
  tagline: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  agencyId: string;
  initialValues: IdentityValues;
  initialLogoUrl: string | null;
};

export default function IdentitySection({ agencyId, initialValues, initialLogoUrl }: Props) {
  const t = useTranslations("dashAgency");
  const { enqueue } = useNotificationContext();
  const [defaults, setDefaults] = useState<IdentityValues>(initialValues);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<IdentityValues>({ defaultValues: initialValues });

  useEffect(() => {
    setDefaults(initialValues);
    reset(initialValues);
  }, [initialValues, reset]);

  const slugWatch = watch("slug");

  const onCancel = () => {
    reset(defaults);
    setIsEditing(false);
    setStatus(null);
  };

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setStatus(null);
      try {
        const cleanSlug = values.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
        await updateAgencyProfile(agencyId, {
          name: values.name.trim(),
          slug: cleanSlug,
          tagline: values.tagline.trim() || null,
        });
        const next = { ...values, slug: cleanSlug };
        setDefaults(next);
        reset(next);
        setIsEditing(false);
        setStatus({ type: "success", message: t("identity.successUpdated") });
        enqueue(
          profileNotification.updated({
            userName: next.name,
            sectionLabel: t("identity.notificationSection"),
            changedFields: [t("identity.fieldName"), t("identity.fieldSlug"), t("identity.fieldTagline")],
          }),
        );
      } catch (err) {
        setStatus({
          type: "error",
          message: err instanceof Error ? err.message : t("identity.errorSave"),
        });
      }
    });
  });

  const handleLogoUpload = async (url: string) => {
    try {
      await updateAgencyProfile(agencyId, { logoUrl: url });
      setLogoUrl(url);
      setStatus({ type: "success", message: t("identity.successLogo") });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : t("identity.errorLogo"),
      });
    }
  };

  return (
    <SectionCard
      title={t("identity.title")}
      description={t("identity.description")}
      actions={
        <EditPencilButton
          isEditing={isEditing}
          onPress={() => (isEditing ? onCancel() : setIsEditing(true))}
          isDisabled={isPending}
          ariaLabel={t("identity.ariaLabel")}
        />
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-6 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/40 p-5 sm:flex-row">
          <AgencyLogoUploader
            agencyId={agencyId}
            currentLogoUrl={logoUrl}
            onUploadSuccess={handleLogoUpload}
          />
          <div className="text-center sm:text-left">
            <h3 className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
              {t("identity.logoTitle")}
            </h3>
            <p className="mt-1 text-sm text-bh-fg-3 max-w-sm">
              {t("identity.logoHint")}
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              key={`name-${defaults.name}`}
              id="agency_name"
              label={t("identity.nameLabel")}
              placeholder={t("identity.namePlaceholder")}
              readOnly={!isEditing}
              defaultValue={defaults.name}
              isRequired
              {...register("name", { required: t("identity.nameRequired") })}
              isInvalid={Boolean(errors.name)}
              errorMessage={errors.name?.message}
            />
            <FormField
              key={`slug-${defaults.slug}`}
              id="agency_slug"
              label={t("identity.slugLabel")}
              placeholder="mi-agencia-fc"
              readOnly={!isEditing}
              defaultValue={defaults.slug}
              isRequired
              description={t("identity.slugDescription", { slug: slugWatch || defaults.slug || "..." })}
              {...register("slug", { required: t("identity.slugRequired") })}
              onChange={(e) => {
                const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                setValue("slug", cleaned, { shouldDirty: true });
              }}
              isInvalid={Boolean(errors.slug)}
              errorMessage={errors.slug?.message}
            />
          </div>

          <FormField
            key={`tagline-${defaults.tagline}`}
            id="agency_tagline"
            label={t("identity.taglineLabel")}
            placeholder={t("identity.taglinePlaceholder")}
            readOnly={!isEditing}
            defaultValue={defaults.tagline}
            description={t("identity.taglineDescription")}
            maxLength={120}
            {...register("tagline")}
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
                {t("identity.saveButton")}
              </Button>
            </div>
          ) : null}
        </form>
      </div>
    </SectionCard>
  );
}
