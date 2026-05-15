"use client";

import BhImageUploader from "@/components/ui/BhImageUploader";

type Props = {
  agencyId: string;
  currentLogoUrl?: string | null;
  onUploadSuccess: (newUrl: string) => void;
};

export default function AgencyLogoUploader({ agencyId, currentLogoUrl, onUploadSuccess }: Props) {
  return (
    <BhImageUploader
      bucket="agency-logos"
      pathFor={(file) => {
        const ext = file.name.split(".").pop() || "jpg";
        return `logos/${agencyId}-${Date.now()}.${ext}`;
      }}
      currentUrl={currentLogoUrl ?? null}
      onUploaded={(publicUrl) => onUploadSuccess(publicUrl)}
      maxBytes={1.5 * 1024 * 1024}
      shape="circle"
      size={96}
      emptyLabel="Sin logo"
    />
  );
}
