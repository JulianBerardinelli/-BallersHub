"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, useDisclosure } from "@heroui/react";
import ArticleModal, { Article } from "./ArticleModal";
import SectionCard from "@/components/dashboard/client/SectionCard";

export default function ArticlesManager({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este artículo?")) return;
    
    try {
      setDeletingId(id);
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete article");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el artículo.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (article: Article) => {
    setArticleToEdit(article);
    onOpen();
  };

  const handleAddNew = () => {
    setArticleToEdit(null);
    onOpen();
  };

  return (
    <SectionCard
      title="Notas de prensa y artículos"
      description="Mantén actualizado tu repositorio de noticias, entrevistas y apariciones en medios."
    >
      <div className="flex flex-col gap-4">
        {articles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-6 text-center text-sm text-neutral-400">
            No has añadido ninguna nota de prensa todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:bg-neutral-800/80"
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-4">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-primary truncate">
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    {item.publisher && <span>{item.publisher}</span>}
                    {item.publisher && item.published_at && <span>•</span>}
                    {item.published_at && <span>{new Date(item.published_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="flat"
                    color="default"
                    onPress={() => handleEdit(item)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    isLoading={deletingId === item.id}
                    onPress={() => handleDelete(item.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div>
          <Button color="primary" variant="flat" onPress={handleAddNew} className="w-full sm:w-auto mt-2">
            Añadir Artículo
          </Button>
        </div>
      </div>
      <p className="text-xs text-neutral-400 mt-4">
        En esta sección podrás cargar notas vinculadas a tu presencia en medios deportivos.
      </p>

      <ArticleModal isOpen={isOpen} onOpenChange={onOpenChange} articleToEdit={articleToEdit} />
    </SectionCard>
  );
}
