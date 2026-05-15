"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, useDisclosure } from "@heroui/react";
import { Plus, Newspaper } from "lucide-react";
import ArticleModal, { Article } from "./ArticleModal";
import SectionCard from "@/components/dashboard/client/SectionCard";

import BhEmptyState from "@/components/ui/BhEmptyState";
import { bhButtonClass } from "@/components/ui/BhButton";
import { usePlanAccess } from "@/components/dashboard/plan/PlanAccessProvider";
import UpgradeCta from "@/components/dashboard/plan/UpgradeCta";
import UpgradeModal, { useUpgradeModal } from "@/components/dashboard/plan/UpgradeModal";

const FREE_ARTICLE_CAP = 3;

export default function ArticlesManager({ articles }: { articles: Article[] }) {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const { access } = usePlanAccess();
  const upgradeModal = useUpgradeModal();

  // Free hard-cap: 3 articles (matrix §B "Links a noticias / prensa" =
  // player_articles entity). Editing existing rows is always allowed.
  const articlesAtCap = !access.isPro && articles.length >= FREE_ARTICLE_CAP;

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
    if (articlesAtCap) {
      upgradeModal.open("pressArticles");
      return;
    }
    setArticleToEdit(null);
    onOpen();
  };

  return (
    <SectionCard
      title="Notas de prensa y artículos"
      description={
        access.isPro
          ? "Mantené actualizado tu repositorio de noticias, entrevistas y apariciones en medios."
          : `Plan Free permite hasta ${FREE_ARTICLE_CAP} notas de prensa. Activá Pro para sumar más.`
      }
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onPress={handleAddNew}
            startContent={<Plus className="h-4 w-4" />}
            className={bhButtonClass({ variant: "lime", size: "sm", className: "mt-1 w-full sm:w-auto" })}
          >
            Añadir artículo
          </Button>
          {!access.isPro && (
            <span className="text-[11px] text-bh-fg-4">
              {articles.length}/{FREE_ARTICLE_CAP} usadas en plan Free
            </span>
          )}
        </div>

        {articlesAtCap && (
          <div className="flex items-center justify-between gap-3 rounded-bh-md border border-bh-lime/20 bg-bh-lime/5 px-4 py-3">
            <p className="text-[12.5px] leading-[1.55] text-bh-fg-2">
              Llegaste al límite del plan Free. Activá Pro para cargar todas las notas que quieras.
            </p>
            <UpgradeCta feature="pressArticles" size="sm" />
          </div>
        )}
      </div>
      <p className="mt-4 text-[11px] text-bh-fg-4">
        En esta sección podés cargar notas vinculadas a tu presencia en medios
        deportivos.
      </p>

      <ArticleModal isOpen={isOpen} onOpenChange={onOpenChange} articleToEdit={articleToEdit} />
      <UpgradeModal state={upgradeModal.state} onClose={upgradeModal.close} />
    </SectionCard>
  );
}
