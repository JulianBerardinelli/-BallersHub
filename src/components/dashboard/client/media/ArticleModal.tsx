"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";

export type Article = {
  id: string;
  title: string;
  url: string;
  publisher: string | null;
  published_at: string | null;
  created_at: string;
};

interface ArticleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ArticleModal({ isOpen, onOpenChange }: ArticleModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    publisher: "",
    publishedAt: "",
  });

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
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save article");
      }

      setFormData({ title: "", url: "", publisher: "", publishedAt: "" });
      onClose();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar el artículo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" backdrop="blur">
      <ModalContent className="bg-neutral-900 border border-neutral-800 text-white">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Añadir Artículo o Nota de Prensa</ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                <Input
                  autoFocus
                  isRequired
                  label="Título de la Nota"
                  name="title"
                  placeholder="Ej: Jugador revelación del torneo..."
                  variant="bordered"
                  value={formData.title}
                  onChange={handleChange}
                  classNames={{ inputWrapper: "border-neutral-700 bg-neutral-900" }}
                />
                <Input
                  isRequired
                  label="Enlace (URL)"
                  name="url"
                  placeholder="https://..."
                  variant="bordered"
                  value={formData.url}
                  onChange={handleChange}
                  classNames={{ inputWrapper: "border-neutral-700 bg-neutral-900" }}
                />
                <Input
                  label="Medio de Comunicación"
                  name="publisher"
                  placeholder="Ej: Diario Olé, Marca, ESPN..."
                  variant="bordered"
                  value={formData.publisher}
                  onChange={handleChange}
                  classNames={{ inputWrapper: "border-neutral-700 bg-neutral-900" }}
                />
                <Input
                  label="Fecha de Publicación"
                  name="publishedAt"
                  type="date"
                  variant="bordered"
                  value={formData.publishedAt}
                  onChange={handleChange}
                  classNames={{ inputWrapper: "border-neutral-700 bg-neutral-900" }}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose} isDisabled={isLoading}>
                Cancelar
              </Button>
              <Button color="primary" onPress={() => handleSubmit(onClose)} isLoading={isLoading}>
                Guardar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
