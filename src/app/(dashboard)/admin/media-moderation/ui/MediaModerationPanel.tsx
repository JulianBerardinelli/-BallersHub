"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Modal, ModalContent, ModalBody, useDisclosure } from "@heroui/react";
import { supabase } from "@/lib/supabase/client";

type PlayerInfo = {
  full_name: string | null;
  slug: string | null;
};

export type PendingMedia = {
  id: string;
  player_id: string;
  type: string;
  url: string;
  provider: string | null;
  created_at: string;
  is_approved: boolean;
  is_flagged: boolean;
  reviewed_by: string | null;
  player: PlayerInfo | null;
};

import AdminInboxLayout, { AdminInboxFilterProps } from "@/components/admin/AdminInboxLayout";
import { Chip } from "@heroui/react";

export default function MediaModerationPanel({ initialMedia }: { initialMedia: PendingMedia[] }) {
  const router = useRouter();
  const [media, setMedia] = useState<PendingMedia[]>(initialMedia);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [statusFilter, setStatusFilter] = useState<AdminInboxFilterProps>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingMedia = media.filter((m) => !m.reviewed_by);
  const historyMedia = media.filter((m) => !!m.reviewed_by);

  const displayedMedia = React.useMemo(() => {
    if (activeTab === "pending") return pendingMedia;
    if (statusFilter === "all") return historyMedia;
    return historyMedia.filter(
      (m) =>
        (statusFilter === "approved" && m.is_approved) ||
        (statusFilter === "rejected" && m.is_flagged)
    );
  }, [pendingMedia, historyMedia, activeTab, statusFilter]);
  
  // State for Image Lightbox
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
    onOpen();
  };

  const handleAction = async (item: PendingMedia, action: "approve" | "reject") => {
    try {
      setProcessingId(item.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Tu sesión ha expirado.");
        return;
      }

      const updates = {
        is_approved: action === "approve",
        is_flagged: action === "reject",
        reviewed_by: user.id,
      };

      const { error } = await supabase.from("player_media").update(updates).eq("id", item.id);

      if (error) {
        console.error("Error actualizando media:", error);
        alert(`Ocurrió un error: ${error.message}`);
        return;
      }

      // Si se rechaza y es una foto subida por el usuario (no un proveedor externo como YouTube)
      // intentamos eliminarla del storage para liberar espacio y asegurar que no quede huérfana
      if (action === "reject" && item.type === "photo" && !item.provider && item.url) {
        try {
          // Extraer el path del archivo desde la URL completa del storage
          const urlParts = item.url.split("/storage/v1/object/public/");
          if (urlParts.length === 2) {
            const pathParts = urlParts[1].split("/");
            const bucket = pathParts[0];
            const filePath = pathParts.slice(1).join("/");
            
            if (bucket && filePath) {
              await supabase.storage.from(bucket).remove([filePath]);
            }
          }
        } catch (storageError) {
          console.error("Error eliminando archivo del storage:", storageError);
          // Omitimos alertar al usuario, la DB ya se actualizó
        }
      }

      // Fallback local update to make UI reactive without waiting for router refresh
      setMedia((prev) => 
        prev.map((m) => 
          m.id === item.id 
            ? { ...m, is_approved: action === "approve", is_flagged: action === "reject", reviewed_by: user.id } 
            : m
        )
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Hubo un error de conexión.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminInboxLayout
      title="Moderación Multimedia"
      description="Sanciona y aprueba fotos o videos subidos por los jugadores en sus tableros antes de que se vean en perfil."
      activeTab={activeTab}
      onTabChange={setActiveTab}
      pendingCount={pendingMedia.length}
      historyCount={historyMedia.length}
      statusFilter={statusFilter}
      onFilterChange={setStatusFilter}
    >
      {displayedMedia.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-8 text-center">
          <p className="text-neutral-400">Excelente, no hay contenido multimedia que mostrar aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayedMedia.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 flex flex-col"
            >
              {/* Media Preview Aspect Ratio Box */}
              <div className="relative h-64 w-full bg-black shrink-0 overflow-hidden">
                {item.type === "photo" && (
                  <img
                    src={item.url}
                    alt={`Media upload de ${item.player?.full_name || "Desconocido"}`}
                    className="h-full w-full object-cover cursor-pointer transition-transform hover:scale-105"
                    onClick={() => handleImageClick(item.url)}
                  />
                )}
                {item.type === "video" && (
                  <div className="flex h-full w-full items-center justify-center p-4">
                    {item.provider === "youtube" ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={getYouTubeEmbedUrl(item.url)}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center gap-2 text-primary hover:underline"
                      >
                        <span>Ver Video / Link</span>
                        <span className="text-xs text-neutral-400 max-w-[200px] truncate">{item.url}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={item.player?.full_name || "???"}
                      size="sm"
                      className="bg-neutral-800 text-neutral-300"
                    />
                    <div className="truncate">
                      <p className="text-sm font-medium text-white max-w-[200px] truncate">
                        {item.player?.full_name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Sube {item.type === "photo" ? "Foto" : "Video"} • {item.created_at.split('T')[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {activeTab === "pending" ? (
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-lg border border-red-900/40 bg-red-500/10 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleAction(item, "reject")}
                      disabled={processingId !== null}
                    >
                      Inapropiado
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center rounded-lg border border-emerald-900/40 bg-emerald-500/10 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleAction(item, "approve")}
                      disabled={processingId !== null}
                    >
                      Aceptar
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex justify-end">
                    <Chip size="sm" color={item.is_approved ? "success" : "danger"} variant="flat">
                      {item.is_approved ? "Aprobado" : "Rechazado"}
                    </Chip>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-size Image Viewer Modal */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        size="5xl" 
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-transparent shadow-none",
          wrapper: "z-[99999]",
          backdrop: "z-[99998]"
        }}
      >
        <ModalContent>
          {(onClose) => (
            <ModalBody 
              className="p-0 flex items-center justify-center min-h-[50vh] cursor-pointer"
              onClick={onClose}
            >
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Vista previa ampliada"
                  className="max-h-[85vh] w-auto max-w-full object-contain rounded-xl cursor-default"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </AdminInboxLayout>
  );
}

// Utilidad simple para asegurar que youtube pinte el player local
function getYouTubeEmbedUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    let videoId = "";
    if (url.hostname.includes("youtube.com")) {
      videoId = url.searchParams.get("v") || "";
    } else if (url.hostname.includes("youtu.be")) {
      videoId = url.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : urlStr;
  } catch (e) {
    return urlStr;
  }
}
