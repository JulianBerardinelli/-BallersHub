"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Select,
  SelectItem,
  Tabs,
  Tab,
} from "@heroui/react";

import { ProfileContext } from "./MultimediaManagerClient";
import FormField from "@/components/dashboard/client/FormField";
import { bhButtonClass } from "@/components/ui/BhButton";
import { bhModalClassNames, bhSelectClassNames } from "@/lib/ui/heroui-brand";

type MediaUploadModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  profileContext?: ProfileContext;
};

export default function MediaUploadModal({ isOpen, onOpenChange, profileContext }: MediaUploadModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"photo" | "video">("photo");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart SEO Suggestions Logic
  const playerName = profileContext?.fullName || "Jugador";
  const playerClub = profileContext?.currentClub || "su equipo";
  let playerNat = profileContext?.nationality || "";
  
  if (playerNat && playerNat.length === 2) {
    try {
      playerNat = new Intl.DisplayNames(['es'], { type: 'region' }).of(playerNat) || playerNat;
    } catch (e) {
      // Ignore if invalid code
    }
  }
  
  const titleSuggestions = activeTab === "photo" 
    ? [
        `${playerName} jugando con ${playerClub}`,
        `Retrato oficial de ${playerName}`
      ]
    : [
        `${playerName} - Highlight Video ${new Date().getFullYear()}`,
        `Mejores jugadas de ${playerName} en ${playerClub}`
      ];
  
  const altTextSuggestions = activeTab === "photo"
    ? [
        `Fotografía de ${playerName} jugando al fútbol`,
        `Retrato deportivo de ${playerName} con la camiseta de ${playerClub}`
      ]
    : [
        `Video de mejores jugadas y skills de ${playerName}`,
        `Competición y highlights de ${playerName} durante la temporada`
      ];
  
  const tagSuggestions = activeTab === "photo"
    ? [playerNat, playerClub, "futbolista", "foto perfil"].filter(Boolean).join(", ")
    : [playerNat, playerClub, "highlights", "skills", "temporada", "posicion"].filter(Boolean).join(", ");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Very basic validation
      if (activeTab === "photo" && !selectedFile.type.startsWith("image/")) {
        setError("Por favor, selecciona una imagen válida.");
        return;
      }
      if (activeTab === "video" && !selectedFile.type.startsWith("video/")) {
        setError("Por favor, selecciona un video válido.");
        return;
      }

      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (activeTab === "photo" && !droppedFile.type.startsWith("image/")) {
        setError("Por favor, selecciona una imagen válida.");
        return;
      }
      if (activeTab === "video" && !droppedFile.type.startsWith("video/")) {
        setError("Por favor, selecciona un video válido.");
        return;
      }
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!acceptedPolicy) {
      setError("Debes aceptar las políticas de uso para continuar.");
      return;
    }

    if (activeTab === "photo" && !file) {
      setError("Por favor, selecciona una foto.");
      return;
    }

    if (activeTab === "video" && !file && !videoUrl) {
      setError("Por favor, selecciona un clip o inserta una URL de YouTube/Vimeo.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("type", activeTab);
      formData.append("title", title);
      formData.append("altText", altText);
      formData.append("tags", tags);
      formData.append("isPrimary", String(isPrimary));

      if (file) {
        formData.append("file", file);
      } else if (activeTab === "video" && videoUrl) {
        formData.append("url", videoUrl);
        // Simple heuristic for provider
        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
          formData.append("provider", "youtube");
        } else if (videoUrl.includes("vimeo.com")) {
          formData.append("provider", "vimeo");
        }
      }

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al subir el archivo");
      }

      // Reset state and close modal
      setFile(null);
      setPreviewUrl(null);
      setVideoUrl("");
      setTitle("");
      setAltText("");
      setTags("");
      setIsPrimary(false);
      setAcceptedPolicy(false);
      onOpenChange(false);
      
      router.refresh(); // Refresh the page to show new media
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      scrollBehavior="inside"
      classNames={bhModalClassNames}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex-col gap-1">
              <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                Añadir multimedia
              </h2>
              <p className="text-sm font-normal text-bh-fg-3">
                Subí fotos o videos para enriquecer tu perfil público.
              </p>
            </ModalHeader>
            <ModalBody className="space-y-6 py-6">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(k) => setActiveTab(k as "photo" | "video")}
                variant="underlined"
                classNames={{
                  tabList: "gap-6 w-full relative rounded-none p-0 border-b border-white/[0.06]",
                  cursor: "w-full bg-bh-lime",
                  tab: "max-w-fit px-0 h-12",
                  tabContent:
                    "text-bh-fg-3 group-data-[selected=true]:text-bh-fg-1 font-medium",
                }}
              >
                <Tab key="photo" title="Fotografía" />
                <Tab key="video" title="Video / Highlight" />
              </Tabs>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-bh-danger text-sm">
                  {error}
                </div>
              )}

              {/* File Dropzone / URL Input */}
              {activeTab === "video" && !previewUrl && (
                <div className="space-y-2">
                  <FormField
                    label="URL del Video (YouTube / Vimeo)"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}


                  />
                  <p className="text-xs text-bh-fg-4">
                    * La subida directa de archivos de video es exclusiva para planes Pro.
                  </p>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={activeTab === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/quicktime"}
              />

              {!previewUrl && activeTab === "photo" && (
                <div
                  className="w-full h-48 border-2 border-dashed border-white/[0.12] hover:border-primary rounded-xl flex flex-col items-center justify-center bg-bh-black transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-4 bg-bh-surface-2 rounded-full mb-3">
                    <svg className="w-6 h-6 text-bh-fg-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-bh-fg-2">Haz clic para buscar o arrastra un archivo aquí</p>
                  <p className="text-xs text-bh-fg-4 mt-1">
                    JPG, PNG o WebP (Max 5MB)
                  </p>
                </div>
              )}

              {previewUrl && (
                <div className="relative w-full aspect-video min-h-[200px] bg-black rounded-xl overflow-hidden border border-white/[0.08]">
                  {activeTab === "photo" ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <video src={previewUrl} controls className="w-full h-full object-contain" />
                  )}
                  <button
                    className="absolute top-2 right-2 bg-bh-surface-1/80 p-2 rounded-lg text-white hover:bg-red-500 transition-colors"
                    onClick={() => {
                       setFile(null);
                       setPreviewUrl(null);
                       if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Quitar archivo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Metadata & SEO Assistant */}
              <div className="space-y-5 bg-bh-surface-1/60 p-5 rounded-xl border border-white/[0.08]">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 drop-shadow-md" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="colorWave" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ff0080">
                          <animate attributeName="stop-color" values="#ff0080;#7928ca;#ff0080" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#7928ca">
                          <animate attributeName="stop-color" values="#7928ca;#ff0080;#7928ca" dur="3s" repeatCount="indefinite" />
                        </stop>
                      </linearGradient>
                    </defs>
                    <path 
                      stroke="url(#colorWave)" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" 
                      fill="url(#colorWave)" 
                      fillOpacity={0.2} 
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
                    Asistente SEO Inteligente
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <FormField
                    label="Título (Opcional)"
                    placeholder={activeTab === "photo" ? "Ej. Jugando la final contra..." : "Ej. Highlight Temporada 2024"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}


                  />
                  <div className="flex flex-wrap gap-2">
                    {titleSuggestions.map((sug, i) => (
                      <button 
                        key={i} 
                        onClick={() => setTitle(sug)}
                        className="text-[10px] bg-bh-surface-2 hover:bg-bh-surface-3 text-bh-fg-2 px-2 py-1 rounded-full transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <FormField
                    label="Texto Alternativo (Alt Text)"
                    placeholder="Describe la imagen para que Google la encuentre..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}


                    description="Ayuda a los motores de búsqueda a entender de qué trata el contenido."
                  />
                   <div className="flex flex-wrap gap-2">
                    {altTextSuggestions.map((sug, i) => (
                      <button 
                        key={i} 
                        onClick={() => setAltText(sug)}
                        className="text-[10px] bg-bh-surface-2 hover:bg-bh-surface-3 text-bh-fg-2 px-2 py-1 rounded-full transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <FormField
                    label="Etiquetas (Tags)"
                    placeholder="separadas por coma (ej: Delantero, Argentino, Jugador profesional)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}


                    description="💡 Es clave incluir equipos de tu trayectoria, posiciones en el campo y palabras relacionadas a tu perfil como jugador para mejorar tu visibilidad web."
                  />
                  <button 
                    onClick={() => setTags(tagSuggestions)}
                    className="text-[10px] bg-bh-surface-2 hover:bg-bh-surface-3 text-bh-fg-2 px-2 py-1 rounded-full transition-colors"
                  >
                    + Usar sugeridas ({tagSuggestions})
                  </button>
                </div>

                 {activeTab === "photo" && (
                  <Select
                    label="Uso de la imagen"
                    placeholder="Galería general"
                    selectedKeys={isPrimary ? ["primary"] : ["gallery"]}
                    onChange={(e) => setIsPrimary(e.target.value === "primary")}
                    variant="flat"
                    classNames={bhSelectClassNames}
                  >
                    <SelectItem key="gallery">Galería general</SelectItem>
                    <SelectItem key="primary">Foto de perfil / portada CV</SelectItem>
                  </Select>
                )}
              </div>

              {/* Legal Disclaimer */}
              <div className="flex items-start gap-3 rounded-bh-md border border-white/[0.08] bg-bh-surface-2/40 p-4">
                <Checkbox
                  isSelected={acceptedPolicy}
                  onValueChange={setAcceptedPolicy}
                  className="mt-1"
                  classNames={{
                    wrapper:
                      "before:border-white/[0.18] after:bg-bh-lime group-data-[selected=true]:after:bg-bh-lime",
                  }}
                />
                <div className="text-[11px] leading-[1.55] text-bh-fg-3">
                  <p className="mb-1 font-semibold text-bh-fg-2">
                    Políticas de uso y moderación
                  </p>
                  <p>
                    Entiendo que el contenido subido estará visible
                    públicamente en mi perfil de inmediato, pero será auditado
                    por el equipo de seguridad.{" "}
                    <strong className="text-bh-fg-2">
                      Cualquier imagen o video con contenido explícito,
                      violento o inapropiado resultará en la eliminación
                      permanente de la cuenta sin derecho a reclamo.
                    </strong>
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                disabled={isUploading}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                Cancelar
              </Button>
              <Button
                onPress={handleUpload}
                isLoading={isUploading}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Subir archivo
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
