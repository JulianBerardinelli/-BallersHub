"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhModalClassNames } from "@/lib/ui/heroui-brand";

export type Article = {
  id: string;
  title: string;
  url: string;
  image_url: string | null;
  publisher: string | null;
  published_at: string | null;
  position: number;
  created_at: string;
};

interface ArticleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  articleToEdit?: Article | null;
}

type ScrapeStatus = "idle" | "loading" | "success" | "error";

type ScrapeResponse = {
  title: string | null;
  imageUrl: string | null;
  publisher: string | null;
  publishedAt: string | null;
};

function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    return u.hostname.includes(".");
  } catch {
    return false;
  }
}

export default function ArticleModal({ isOpen, onOpenChange, articleToEdit }: ArticleModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    imageUrl: "",
    publisher: "",
    publishedAt: "",
  });
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const lastScrapedUrl = useRef<string | null>(null);
  const scrapeAbort = useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (articleToEdit) {
        setFormData({
          title: articleToEdit.title || "",
          url: articleToEdit.url || "",
          imageUrl: articleToEdit.image_url || "",
          publisher: articleToEdit.publisher || "",
          publishedAt: articleToEdit.published_at
            ? new Date(articleToEdit.published_at).toISOString().split('T')[0]
            : "",
        });
        lastScrapedUrl.current = articleToEdit.url || null;
      } else {
        setFormData({ title: "", url: "", imageUrl: "", publisher: "", publishedAt: "" });
        lastScrapedUrl.current = null;
      }
      setScrapeStatus("idle");
      setScrapeError(null);
    } else {
      // Cancel in-flight scrape when modal closes
      scrapeAbort.current?.abort();
    }
  }, [isOpen, articleToEdit]);

  const runScrape = async (url: string) => {
    // Edit mode: never scrape automatically — user already curated this row
    if (articleToEdit) return;
    const normalized = url.trim();
    if (!looksLikeUrl(normalized)) return;
    if (lastScrapedUrl.current === normalized) return;
    lastScrapedUrl.current = normalized;

    scrapeAbort.current?.abort();
    const controller = new AbortController();
    scrapeAbort.current = controller;

    setScrapeStatus("loading");
    setScrapeError(null);

    try {
      const res = await fetch("/api/articles/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No pudimos leer la página");
      }

      const data = (await res.json()) as ScrapeResponse;

      // Only fill fields that are still empty — never overwrite user input
      setFormData((prev) => ({
        ...prev,
        title: prev.title || data.title || "",
        imageUrl: prev.imageUrl || data.imageUrl || "",
        publisher: prev.publisher || data.publisher || "",
        publishedAt: prev.publishedAt || data.publishedAt || "",
      }));
      setScrapeStatus("success");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setScrapeStatus("error");
      setScrapeError((err as Error).message || "No pudimos leer la página");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // Reset banner if user starts editing url manually
    if (e.target.name === "url" && scrapeStatus !== "idle") {
      setScrapeStatus("idle");
      setScrapeError(null);
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    // Fire scrape on next tick (after React updates the input value)
    setTimeout(() => runScrape(pasted), 0);
  };

  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    runScrape(e.target.value);
  };

  const handleSubmit = async (onClose: () => void) => {
    if (!formData.title || !formData.url) {
      alert("El título y el enlace son obligatorios.");
      return;
    }

    try {
      setIsLoading(true);
      const isEdit = !!articleToEdit;
      const apiUrl = isEdit ? `/api/articles/${articleToEdit.id}` : "/api/articles";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error(isEdit ? "Failed to update article" : "Failed to save article");
      }

      setFormData({ title: "", url: "", imageUrl: "", publisher: "", publishedAt: "" });
      onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(articleToEdit ? "Hubo un error al actualizar el artículo." : "Hubo un error al guardar el artículo.");
    } finally {
      setIsLoading(false);
    }
  };

  const urlEndContent =
    scrapeStatus === "loading" ? (
      <Loader2 className="h-4 w-4 animate-spin text-bh-lime" aria-label="Buscando datos" />
    ) : null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="blur"
      classNames={bhModalClassNames}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>
              {articleToEdit ? "Editar artículo" : "Añadir artículo o nota de prensa"}
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                {!articleToEdit && (
                  <p className="text-[11.5px] leading-[1.5] text-bh-fg-4">
                    Pegá el link de la nota y completamos título, medio, fecha e imagen automáticamente. Todo queda editable.
                  </p>
                )}
                <FormField
                  id="bh-am-url"
                  isRequired
                  label="Enlace (URL)"
                  name="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={handleChange}
                  onPaste={!articleToEdit ? handleUrlPaste : undefined}
                  onBlur={!articleToEdit ? handleUrlBlur : undefined}
                  endContent={urlEndContent}
                />

                {scrapeStatus === "success" && (
                  <div className="flex items-start gap-2 rounded-bh-md border border-bh-lime/30 bg-bh-lime/5 px-3 py-2 text-[12px] leading-[1.5] text-bh-fg-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bh-lime" />
                    <span>Datos traídos automáticamente. Revisá y editá lo que necesites antes de guardar.</span>
                  </div>
                )}
                {scrapeStatus === "error" && (
                  <div className="flex items-start gap-2 rounded-bh-md border border-bh-danger/30 bg-bh-danger/5 px-3 py-2 text-[12px] leading-[1.5] text-bh-fg-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bh-danger" />
                    <span>{scrapeError || "No pudimos leer la página."} Completá los datos manualmente.</span>
                  </div>
                )}

                <FormField
                  id="bh-am-title"
                  isRequired
                  label="Título de la nota"
                  name="title"
                  placeholder="Ej: Jugador revelación del torneo..."
                  value={formData.title}
                  onChange={handleChange}
                />
                <FormField
                  id="bh-am-publisher"
                  label="Medio de comunicación"
                  name="publisher"
                  placeholder="Ej: Diario Olé, Marca, ESPN..."
                  value={formData.publisher}
                  onChange={handleChange}
                />
                <FormField
                  id="bh-am-image"
                  label="URL de imagen / miniatura"
                  name="imageUrl"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={handleChange}
                  description="Añadí el link directo a la foto o miniatura del medio."
                />
                {formData.imageUrl && (
                  <div className="overflow-hidden rounded-bh-md border border-white/[0.06] bg-bh-surface-1/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.imageUrl}
                      alt="Vista previa"
                      className="max-h-32 w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <FormField
                  id="bh-am-published"
                  label="Fecha de publicación"
                  name="publishedAt"
                  type="date"
                  value={formData.publishedAt}
                  onChange={handleChange}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={isLoading}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                Cancelar
              </Button>
              <Button
                onPress={() => handleSubmit(onClose)}
                isLoading={isLoading}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Guardar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
