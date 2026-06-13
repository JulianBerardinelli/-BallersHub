"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Tabs,
  Tab,
  Select,
  SelectItem,
} from "@heroui/react";
import { X } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SquooshHint from "@/components/ui/SquooshHint";
import { bhButtonClass } from "@/components/ui/bh-button-class";
import { bhModalClassNames, bhSelectClassNames } from "@/lib/ui/heroui-brand";

export type MediaCatalogTab = "photo" | "video";

export type MediaCatalogPayload = {
  type: MediaCatalogTab;
  file: File | null;
  videoUrl: string;
  title: string;
  altText: string;
  tags: string;
  isPrimary: boolean;
  provider: "youtube" | "vimeo" | null;
  /** Season year (e.g. 2024 for the 2024-25 season). Only set when type=video. */
  seasonYear: number | null;
};

export type SeoSuggestionsByTab = Partial<
  Record<
    MediaCatalogTab,
    {
      titles: string[];
      altTexts: string[];
      tags?: string;
    }
  >
>;

export type MediaCatalogModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header copy. */
  modalTitle: string;
  modalSubtitle?: string;
  /** Hide tabs and lock to "photo" if videos are not allowed.
   *  Set `photos: false` to lock the modal to video-only (used for Free
   *  users where the photo catalog is gated to Pro). */
  features?: {
    videos?: boolean;
    photos?: boolean;
    tags?: boolean;
    isPrimary?: boolean;
  };
  /** Per-tab SEO suggestions. */
  seo: SeoSuggestionsByTab;
  /** Maximum file size in bytes for photos. Default 5MB. */
  maxPhotoBytes?: number;
  /** Caller performs storage upload + DB insert. Throw to surface error. */
  onSubmit: (payload: MediaCatalogPayload) => Promise<void>;
  /** Called after successful submit, useful to refresh route. */
  onSuccess?: () => void;
};

const DEFAULT_FEATURES = { videos: false, photos: true, tags: false, isPrimary: false };

export default function MediaCatalogModal({
  isOpen,
  onOpenChange,
  modalTitle,
  modalSubtitle,
  features,
  seo,
  maxPhotoBytes = 5 * 1024 * 1024,
  onSubmit,
  onSuccess,
}: MediaCatalogModalProps) {
  const t = useTranslations("dashEditProfile");
  const f = { ...DEFAULT_FEATURES, ...(features ?? {}) };

  // When photos are gated (Free user), force the modal to start on the
  // video tab. Otherwise default to photo as before.
  const initialTab: MediaCatalogTab =
    features?.photos === false ? "video" : "photo";
  const [activeTab, setActiveTab] = useState<MediaCatalogTab>(initialTab);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [seasonYearInput, setSeasonYearInput] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();

  const tabSeo = seo[activeTab] ?? { titles: [], altTexts: [] };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setVideoUrl("");
    setTitle("");
    setAltText("");
    setTags("");
    setIsPrimary(false);
    setSeasonYearInput("");
    setAcceptedPolicy(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (activeTab === "photo" && !selected.type.startsWith("image/")) {
      setError(t("media.catalogModal.errorInvalidPhoto"));
      return;
    }
    if (activeTab === "video" && !selected.type.startsWith("video/")) {
      setError(t("media.catalogModal.errorInvalidVideo"));
      return;
    }
    if (activeTab === "photo" && selected.size > maxPhotoBytes) {
      setError(
        t("media.catalogModal.errorPhotoTooLarge", {
          max: Math.round(maxPhotoBytes / (1024 * 1024)),
        }),
      );
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  };

  const handleUpload = async () => {
    if (!acceptedPolicy) {
      setError(t("media.catalogModal.errorAcceptPolicy"));
      return;
    }
    if (activeTab === "photo" && !file) {
      setError(t("media.catalogModal.errorPhotoRequired"));
      return;
    }
    if (activeTab === "video" && !file && !videoUrl.trim()) {
      setError(t("media.catalogModal.errorVideoRequired"));
      return;
    }

    let seasonYearValue: number | null = null;
    if (activeTab === "video" && seasonYearInput.trim()) {
      const parsed = parseInt(seasonYearInput.trim(), 10);
      if (!Number.isFinite(parsed) || parsed < 1900 || parsed > 2100) {
        setError(t("media.catalogModal.errorSeasonYearRange"));
        return;
      }
      seasonYearValue = parsed;
    }

    setIsUploading(true);
    setError(null);

    try {
      let provider: "youtube" | "vimeo" | null = null;
      if (activeTab === "video" && videoUrl) {
        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) provider = "youtube";
        else if (videoUrl.includes("vimeo.com")) provider = "vimeo";
      }

      await onSubmit({
        type: activeTab,
        file,
        videoUrl: videoUrl.trim(),
        title: title.trim(),
        altText: altText.trim(),
        tags: tags.trim(),
        isPrimary,
        provider,
        seasonYear: seasonYearValue,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("media.catalogModal.errorUploadFallback"));
    } finally {
      setIsUploading(false);
    }
  };

  const acceptAttr =
    activeTab === "photo"
      ? "image/jpeg,image/png,image/webp,image/avif"
      : "video/mp4,video/quicktime";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      placement="center"
      scrollBehavior="inside"
      classNames={bhModalClassNames}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex-col gap-1">
              <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                {modalTitle}
              </h2>
              {modalSubtitle ? (
                <p className="text-[13px] font-normal text-bh-fg-3">{modalSubtitle}</p>
              ) : null}
            </ModalHeader>

            <ModalBody className="space-y-4 py-4">
              {f.videos && f.photos ? (
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={(k) => setActiveTab(k as MediaCatalogTab)}
                  variant="underlined"
                  classNames={{
                    tabList: "gap-6 w-full relative rounded-none p-0 border-b border-white/[0.06]",
                    cursor: "w-full bg-bh-lime",
                    tab: "max-w-fit px-0 h-10",
                    tabContent:
                      "text-bh-fg-3 group-data-[selected=true]:text-bh-fg-1 font-medium",
                  }}
                >
                  <Tab key="photo" title={t("media.catalogModal.tabPhoto")} />
                  <Tab key="video" title={t("media.catalogModal.tabVideo")} />
                </Tabs>
              ) : null}

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-sm text-bh-danger">
                  {error}
                </div>
              )}

              {activeTab === "video" && !previewUrl && (
                <div className="space-y-1.5">
                  <FormField
                    label={t("media.catalogModal.videoUrlLabel")}
                    placeholder={t("media.catalogModal.videoUrlPlaceholder")}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <p className="text-[11px] text-bh-fg-4">
                    {t("media.catalogModal.videoUrlHelp")}
                  </p>
                </div>
              )}

              {activeTab === "video" && (
                <FormField
                  label={t("media.catalogModal.seasonYearLabel")}
                  placeholder={t("media.catalogModal.seasonYearPlaceholder", { year: currentYear })}
                  type="number"
                  min={1900}
                  max={2100}
                  step={1}
                  inputMode="numeric"
                  value={seasonYearInput}
                  onChange={(e) => setSeasonYearInput(e.target.value)}
                  description={t("media.catalogModal.seasonYearDescription")}
                />
              )}

              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                accept={acceptAttr}
              />

              {!previewUrl && activeTab === "photo" && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-bh-md border-2 border-dashed border-white/[0.12] bg-bh-black transition-colors hover:border-bh-lime"
                >
                  <div className="mb-2 rounded-full bg-bh-surface-2 p-2.5">
                    <svg className="h-5 w-5 text-bh-fg-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-bh-fg-2">
                    {t("media.catalogModal.dropzoneTitle")}
                  </p>
                  <p className="text-[11px] text-bh-fg-4">
                    {t("media.catalogModal.dropzoneFormats", { max: Math.round(maxPhotoBytes / (1024 * 1024)) })}
                  </p>
                  <p className="mt-1 text-[10px] text-bh-fg-4">
                    {t("media.catalogModal.dropzoneConvert")}
                  </p>
                </button>
              )}

              {!previewUrl && activeTab === "photo" && (
                <SquooshHint maxBytes={maxPhotoBytes} accept="image/jpeg,image/png,image/webp,image/avif" />
              )}

              {previewUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-bh-md border border-white/[0.08] bg-black">
                  {activeTab === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={t("media.catalogModal.previewAlt")} className="h-full w-full object-contain" />
                  ) : (
                    <video src={previewUrl} controls className="h-full w-full object-contain" />
                  )}
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-lg bg-bh-surface-1/80 p-1.5 text-white transition-colors hover:bg-red-500"
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title={t("media.catalogModal.removeFile")}
                    aria-label={t("media.catalogModal.removeFile")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* SEO Assistant */}
              <div className="space-y-3 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-3.5">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 drop-shadow-md" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="catalogColorWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff0080">
                          <animate
                            attributeName="stop-color"
                            values="#ff0080;#7928ca;#ff0080"
                            dur="3s"
                            repeatCount="indefinite"
                          />
                        </stop>
                        <stop offset="100%" stopColor="#7928ca">
                          <animate
                            attributeName="stop-color"
                            values="#7928ca;#ff0080;#7928ca"
                            dur="3s"
                            repeatCount="indefinite"
                          />
                        </stop>
                      </linearGradient>
                    </defs>
                    <path
                      stroke="url(#catalogColorWave)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                      fill="url(#catalogColorWave)"
                      fillOpacity={0.2}
                    />
                  </svg>
                  <h3 className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-[12px] font-semibold text-transparent">
                    {t("media.catalogModal.seoAssistantTitle")}
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <FormField
                    label={t("media.catalogModal.titleLabel")}
                    placeholder={
                      activeTab === "photo"
                        ? t("media.catalogModal.titlePlaceholderPhoto")
                        : t("media.catalogModal.titlePlaceholderVideo")
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {tabSeo.titles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tabSeo.titles.map((sug, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setTitle(sug)}
                          className="rounded-full bg-bh-surface-2 px-2 py-0.5 text-[10px] text-bh-fg-2 transition-colors hover:bg-bh-surface-3"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FormField
                    label={t("media.catalogModal.altLabel")}
                    placeholder={t("media.catalogModal.altPlaceholder")}
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    description={t("media.catalogModal.altDescription")}
                  />
                  {tabSeo.altTexts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tabSeo.altTexts.map((sug, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setAltText(sug)}
                          className="rounded-full bg-bh-surface-2 px-2 py-0.5 text-[10px] text-bh-fg-2 transition-colors hover:bg-bh-surface-3"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {f.tags && (
                  <div className="space-y-1.5">
                    <FormField
                      label={t("media.catalogModal.tagsLabel")}
                      placeholder={t("media.catalogModal.tagsPlaceholder")}
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      description={t("media.catalogModal.tagsDescription")}
                    />
                    {tabSeo.tags && (
                      <button
                        type="button"
                        onClick={() => setTags(tabSeo.tags ?? "")}
                        className="rounded-full bg-bh-surface-2 px-2 py-0.5 text-[10px] text-bh-fg-2 transition-colors hover:bg-bh-surface-3"
                      >
                        {t("media.catalogModal.tagsUseSuggested")}
                      </button>
                    )}
                  </div>
                )}

                {f.isPrimary && activeTab === "photo" && (
                  <Select
                    label={t("media.catalogModal.usageLabel")}
                    placeholder={t("media.catalogModal.usageGallery")}
                    selectedKeys={isPrimary ? ["primary"] : ["gallery"]}
                    onChange={(e) => setIsPrimary(e.target.value === "primary")}
                    variant="flat"
                    classNames={bhSelectClassNames}
                  >
                    <SelectItem key="gallery">{t("media.catalogModal.usageGallery")}</SelectItem>
                    <SelectItem key="primary">{t("media.catalogModal.usagePrimary")}</SelectItem>
                  </Select>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-bh-md border border-white/[0.08] bg-bh-surface-2/40 p-3">
                <Checkbox
                  isSelected={acceptedPolicy}
                  onValueChange={setAcceptedPolicy}
                  className="mt-1"
                  classNames={{
                    wrapper:
                      "before:border-white/[0.18] after:bg-bh-lime group-data-[selected=true]:after:bg-bh-lime",
                  }}
                />
                <div className="text-[11px] leading-[1.55] text-bh-fg-3">
                  <p className="mb-1 font-semibold text-bh-fg-2">
                    {t("media.catalogModal.policyTitle")}
                  </p>
                  <p>
                    {t("media.catalogModal.policyBody")}{" "}
                    <strong className="text-bh-fg-2">
                      {t("media.catalogModal.policyEmphasis")}
                    </strong>
                  </p>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isUploading}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                {t("media.catalogModal.cancel")}
              </Button>
              <Button
                onPress={handleUpload}
                isLoading={isUploading}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                {t("media.catalogModal.upload")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
