"use client";

import { useRouter } from "next/navigation";
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
        `Equipo de ${agencyContext.name}`,
        `Oficinas de ${agencyContext.name}${hq ? ` en ${hq}` : ""}`,
        `Eventos profesionales de ${agencyContext.name}`,
      ].filter(Boolean),
      altTexts: [
        `Fotografía oficial de la agencia ${agencyContext.name}`,
        `Imagen institucional de ${agencyContext.name}${country ? ` con operación en ${country}` : ""}`,
      ].filter(Boolean),
    },
  };

  return (
    <MediaCatalogModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      modalTitle="Subir imagen al catálogo"
      modalSubtitle="Hasta 5 imágenes (oficinas, equipo, eventos, presentaciones)."
      seo={seo}
      onSubmit={async ({ file, title, altText }) => {
        if (!file) throw new Error("Seleccioná un archivo.");
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
