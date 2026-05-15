"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

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
  created_at: string;
};

interface ArticleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  articleToEdit?: Article | null;
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

  // Populate form when modal opens with an article to edit
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
      } else {
        setFormData({ title: "", url: "", imageUrl: "", publisher: "", publishedAt: "" });
      }
    }
  }, [isOpen, articleToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
                <FormField
                  id="bh-am-title"
                  autoFocus
                  isRequired
                  label="Título de la nota"
                  name="title"
                  placeholder="Ej: Jugador revelación del torneo..."
                  value={formData.title}
                  onChange={handleChange}
                />
                <FormField
                  id="bh-am-url"
                  isRequired
                  label="Enlace (URL)"
                  name="url"
                  placeholder="https://..."
                  value={formData.url}
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
