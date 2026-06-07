"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ImageOff } from "lucide-react";
import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/bh-button-class";
import { deleteAgencyMediaAction } from "@/app/actions/agency-media";

export type AgencyMediaItem = {
  id: string;
  url: string;
  title: string | null;
  altText: string | null;
  createdAt: string | Date;
};

export default function AgencyMediaGrid({ items }: { items: AgencyMediaItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta imagen del catálogo?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteAgencyMediaAction(id);
        router.refresh();
      } catch (err) {
        console.error("Error deleting agency media", err);
        alert(err instanceof Error ? err.message : "No se pudo eliminar la imagen.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  if (!items || items.length === 0) {
    return (
      <BhEmptyState
        icon={<ImageOff className="h-5 w-5" />}
        title="Sin imágenes"
        description="Aún no agregaste fotos al catálogo de la agencia."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const created = typeof item.createdAt === "string" ? new Date(item.createdAt) : item.createdAt;
        return (
          <div
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 transition-colors hover:border-white/[0.18]"
          >
            <div className="relative aspect-video w-full bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.altText || item.title || "Imagen de la agencia"}
                className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="mb-3">
                <p
                  className="truncate font-bh-heading text-[14px] font-semibold text-bh-fg-1"
                  title={item.title || "Sin título"}
                >
                  {item.title || "Imagen sin título"}
                </p>
                {item.altText && (
                  <p
                    className="mt-0.5 truncate text-[11px] text-bh-fg-3"
                    title={item.altText}
                  >
                    {item.altText}
                  </p>
                )}
                <p className="font-bh-mono text-[11px] text-bh-fg-4">
                  {created.toLocaleDateString()}
                </p>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-3">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => handleDelete(item.id)}
                  isLoading={deletingId === item.id}
                  className={bhButtonClass({
                    variant: "danger-soft",
                    size: "sm",
                    className: "w-full flex-1",
                  })}
                >
                  {deletingId === item.id ? "Borrando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
