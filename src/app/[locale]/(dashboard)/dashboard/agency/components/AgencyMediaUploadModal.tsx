"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createBrowserClient } from "@supabase/ssr";

import MediaCatalogModal, {
  type SeoSuggestionsByTab,
} from "@/components/dashboard/client/media/MediaCatalogModal";
import { addAgencyMediaAction } from "@/app/actions/agency-media";
import { AGENCY_MEDIA_BUCKET } from "@/app/actions/agency-media-constants";

const BUCKET = AGENCY_MEDIA_BUCKET;

type AgencyContext = {
  name: string;
  headquarters: string | null;
  operativeCountries: string[] | null;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  agencyId: string;
  agencyContext: AgencyContext;
};

export default function AgencyMediaUploadModal({
  isOpen,
  onOpenChange,
  agencyId,
  agencyContext,
}: Props) {
  const t = useTranslations("dashAgency");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const dnEs =
    typeof window !== "undefined"
      ? new Intl.DisplayNames(["es"], { type: "region", fallback: "code" })
      : null;

  const country = agencyContext.operativeCountries?.[0]
    ? dnEs?.of(agencyContext.operativeCountries[0]) ?? agencyContext.operativeCountries[0]
    : "";
  const hq = agencyContext.headquarters ?? "";

  const seo: SeoSuggestionsByTab = {
    photo: {
      titles: [
        t("media.seoTeam", { name: agencyContext.name }),
        hq
          ? t("media.seoOfficesIn", { name: agencyContext.name, hq })
          : t("media.seoOffices", { name: agencyContext.name }),
        t("media.seoEvents", { name: agencyContext.name }),
      ].filter(Boolean),
      altTexts: [
        t("media.seoAltOfficial", { name: agencyContext.name }),
        country
          ? t("media.seoAltInstitutionalIn", { name: agencyContext.name, country })
          : t("media.seoAltInstitutional", { name: agencyContext.name }),
      ].filter(Boolean),
    },
  };

  return (
    <MediaCatalogModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      modalTitle={t("media.modalTitle")}
      modalSubtitle={t("media.modalSubtitle")}
      seo={seo}
      onSubmit={async ({ file, title, altText }) => {
        if (!file) throw new Error(t("media.errorSelectFile"));
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `gallery/${agencyId}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true, contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

        await addAgencyMediaAction({
          url: pub.publicUrl,
          title: title || null,
          altText: altText || null,
        });
      }}
      onSuccess={() => router.refresh()}
    />
  );
}
