"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, useDisclosure } from "@heroui/react";
import { Plus, Newspaper } from "lucide-react";
import ArticleModal, { Article } from "./ArticleModal";
import SectionCard from "@/components/dashboard/client/SectionCard";

import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/BhButton";

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
      description="Mantené actualizado tu repositorio de noticias, entrevistas y apariciones en medios."
    >
      <div className="flex flex-col gap-4">
        {articles.length === 0 ? (
          <BhEmptyState
            icon={<Newspaper className="h-5 w-5" />}
            title="Sin artículos"
            description="No añadiste ninguna nota de prensa todavía."
          />
        ) : (
          <div className="space-y-2">
            {articles.map((item) => (
              <div
                key={item.id}
                className="bh-card-lift flex items-center justify-between rounded-bh-md border border-white/[0.06] bg-bh-surface-1/60 p-4"
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-4">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-bh-heading text-[14px] font-semibold text-bh-fg-1 transition-colors hover:text-bh-lime"
                  >
                    {item.title}
                  </a>
                  <div className="flex items-center gap-2 text-[11px] text-bh-fg-4">
                    {item.publisher && <span>{item.publisher}</span>}
                    {item.publisher && item.published_at && <span>•</span>}
                    {item.published_at && (
                      <span className="font-bh-mono">
                        {new Date(item.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => handleEdit(item)}
                    className={bhButtonClass({ variant: "ghost", size: "sm" })}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    isLoading={deletingId === item.id}
                    onPress={() => handleDelete(item.id)}
                    className={bhButtonClass({ variant: "danger-soft", size: "sm" })}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <Button
            onPress={handleAddNew}
            startContent={<Plus className="h-4 w-4" />}
            className={bhButtonClass({ variant: "lime", size: "sm", className: "mt-1 w-full sm:w-auto" })}
          >
            Añadir artículo
          </Button>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-bh-fg-4">
        En esta sección podés cargar notas vinculadas a tu presencia en medios
        deportivos.
      </p>

      <ArticleModal isOpen={isOpen} onOpenChange={onOpenChange} articleToEdit={articleToEdit} />
    </SectionCard>
  );
}
