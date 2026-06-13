"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { updateManagerProfile } from "@/app/actions/manager-profiles";
import type { ManagerProfile } from "@/db/schema/managerProfiles";
import FormField from "@/components/dashboard/client/FormField";
import BhImageUploader from "@/components/ui/BhImageUploader";
import { bhButtonClass } from "@/components/ui/bh-button-class";

export default function ManagerProfileForm({ profile }: { profile: ManagerProfile }) {
  const t = useTranslations("dashAgency");
  const [formData, setFormData] = useState({
    fullName: profile.fullName || "",
    avatarUrl: profile.avatarUrl || "",
    bio: profile.bio || "",
    contactEmail: profile.contactEmail || "",
    contactPhone: profile.contactPhone || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const result = await updateManagerProfile(formData);

    setIsSubmitting(false);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: t("managerProfile.successUpdated") });
      router.refresh();
    }
  };

  const handleAvatarUpload = async (publicUrl: string) => {
    setFormData((curr) => ({ ...curr, avatarUrl: publicUrl }));
    const result = await updateManagerProfile({ ...formData, avatarUrl: publicUrl });
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: t("managerProfile.successPhotoUpdated") });
      router.refresh();
    }
  };

  const handleAvatarRemove = async () => {
    setFormData((curr) => ({ ...curr, avatarUrl: "" }));
    const result = await updateManagerProfile({ ...formData, avatarUrl: "" });
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: t("managerProfile.successPhotoRemoved") });
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar Section */}
      <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6">
        <div className="mb-5 space-y-1">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            {t("managerProfile.avatarTitle")}
          </h3>
          <p className="max-w-xl text-sm leading-[1.55] text-bh-fg-3">
            {t("managerProfile.avatarDescription")}
          </p>
        </div>

        <BhImageUploader
          bucket="manager-avatars"
          pathFor={(file) => {
            const ext = file.name.split(".").pop() || "jpg";
            return `${profile.userId}/${profile.id}-${Date.now()}.${ext}`;
          }}
          currentUrl={formData.avatarUrl || null}
          onUploaded={handleAvatarUpload}
          onRemove={handleAvatarRemove}
          maxBytes={1.5 * 1024 * 1024}
          shape="circle"
          size={96}
          emptyLabel={t("managerProfile.avatarEmptyLabel")}
        />
      </div>

      {feedback && (
        <div
          className={`rounded-bh-md border p-3 text-sm ${
            feedback.type === "success"
              ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-bh-success"
              : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-bh-danger"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="bh-mp-full-name"
          label={t("managerProfile.fullNameLabel")}
          placeholder={t("managerProfile.fullNamePlaceholder")}
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          isRequired
        />

        <FormField
          id="bh-mp-email"
          label={t("managerProfile.contactEmailLabel")}
          placeholder={t("managerProfile.contactEmailPlaceholder")}
          type="email"
          value={formData.contactEmail}
          onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          isRequired
        />

        <FormField
          id="bh-mp-phone"
          label={t("managerProfile.contactPhoneLabel")}
          placeholder={t("managerProfile.contactPhonePlaceholder")}
          value={formData.contactPhone}
          onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
        />
      </div>

      <FormField
        as="textarea"
        id="bh-mp-bio"
        label={t("managerProfile.bioLabel")}
        placeholder={t("managerProfile.bioPlaceholder")}
        rows={4}
        value={formData.bio}
        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
      />

      <div className="flex justify-end border-t border-white/[0.06] pt-5">
        <Button
          type="submit"
          isLoading={isSubmitting}
          className={bhButtonClass({ variant: "lime", size: "sm" })}
        >
          {t("managerProfile.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
