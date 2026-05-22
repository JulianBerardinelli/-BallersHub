"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
} from "@heroui/react";

import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/bh-button-class";
import { bhModalClassNames, bhSelectClassNames } from "@/lib/ui/heroui-brand";
import type { PlayerMedia } from "@/db/schema/media";

export type MediaEditModalProps = {
  item: PlayerMedia | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

const SEASON_MIN = 1900;
const SEASON_MAX = 2100;

export default function MediaEditModal({ item, isOpen, onOpenChange, onSaved }: MediaEditModalProps) {
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [seasonYear, setSeasonYear] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync the form whenever the modal opens for a different item.
  useEffect(() => {
    if (!isOpen || !item) return;
    setTitle(item.title ?? "");
    setAltText(item.altText ?? "");
    setTags(Array.isArray(item.tags) ? item.tags.join(", ") : "");
    setSeasonYear(item.seasonYear != null ? String(item.seasonYear) : "");
    setIsPrimary(Boolean(item.isPrimary));
    setError(null);
  }, [isOpen, item]);

  if (!item) return null;

  const isVideo = item.type === "video";
  const isPhoto = item.type === "photo";

  const handleSave = async () => {
    let seasonYearValue: number | null = null;
    if (isVideo && seasonYear.trim()) {
      const parsed = parseInt(seasonYear.trim(), 10);
      if (!Number.isFinite(parsed) || parsed < SEASON_MIN || parsed > SEASON_MAX) {
        setError(`El año debe estar entre ${SEASON_MIN} y ${SEASON_MAX}.`);
        return;
      }
      seasonYearValue = parsed;
    }

    setIsSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        altText: altText.trim(),
        tags: tags.trim(),
      };
      if (isVideo) body.seasonYear = seasonYearValue;
      if (isPhoto) body.isPrimary = isPrimary;

      const res = await fetch(`/api/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(data.error || "No se pudo guardar los cambios.");
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

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
                Editar {isVideo ? "video" : "imagen"}
              </h2>
              <p className="text-[13px] font-normal text-bh-fg-3">
                Actualizá título, etiquetas SEO {isVideo ? "y año de la temporada" : "y uso de la imagen"}.
              </p>
            </ModalHeader>

            <ModalBody className="space-y-4 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-sm text-bh-danger">
                  {error}
                </div>
              )}

              <div className="space-y-3 rounded-bh-md border border-white/[0.08] bg-bh-surface-1/60 p-3.5">
                <FormField
                  label="Título"
                  placeholder={isVideo ? "Ej. Highlights temporada 2024" : "Ej. Foto en el evento institucional"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                {isVideo && (
                  <FormField
                    label="Año de la temporada"
                    placeholder="Ej. 2024"
                    type="number"
                    min={SEASON_MIN}
                    max={SEASON_MAX}
                    step={1}
                    inputMode="numeric"
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(e.target.value)}
                    description="Usá el año en que arrancó la temporada (ej. 2024 para 2024-25). Dejalo vacío si no aplica."
                  />
                )}

                <FormField
                  label="Texto alternativo (alt text)"
                  placeholder="Describí el contenido para que Google lo encuentre…"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  description="Mejora la accesibilidad y el posicionamiento."
                />

                <FormField
                  label="Etiquetas (tags)"
                  placeholder="separadas por coma (ej: Delantero, Argentino…)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  description="Incluí equipos, posiciones y palabras clave."
                />

                {isPhoto && (
                  <Select
                    label="Uso de la imagen"
                    placeholder="Galería general"
                    selectedKeys={isPrimary ? ["primary"] : ["gallery"]}
                    onChange={(e) => setIsPrimary(e.target.value === "primary")}
                    variant="flat"
                    classNames={bhSelectClassNames}
                  >
                    <SelectItem key="gallery">Galería general</SelectItem>
                    <SelectItem key="primary">Foto principal / portada</SelectItem>
                  </Select>
                )}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isSaving}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                Cancelar
              </Button>
              <Button
                onPress={handleSave}
                isLoading={isSaving}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Guardar cambios
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
