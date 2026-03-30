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
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
} from "@heroui/react";

import { ProfileContext } from "./MultimediaManagerClient";

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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside">
      <ModalContent className="bg-neutral-900 text-white border border-neutral-800">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b border-neutral-800">
              <h2 className="text-xl font-bold">Añadir Multimedia</h2>
              <p className="text-sm font-normal text-neutral-400">
                Sube fotos o videos para enriquecer tu perfil público.
              </p>
            </ModalHeader>
            <ModalBody className="py-6 space-y-6">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(k) => setActiveTab(k as "photo" | "video")}
                color="primary"
                variant="underlined"
                classNames={{
                  tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                  cursor: "w-full",
                  tab: "max-w-fit px-0 h-12",
                  tabContent: "group-data-[selected=true]:text-primary"
                }}
              >
                <Tab key="photo" title="Fotografía" />
                <Tab key="video" title="Video / Highlight" />
              </Tabs>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                  {error}
                </div>
              )}

              {/* File Dropzone / URL Input */}
              {activeTab === "video" && !previewUrl && (
                <div className="space-y-2">
                  <Input
                    label="URL del Video (YouTube / Vimeo)"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    variant="bordered"
                    classNames={{ inputWrapper: "border-neutral-700 bg-neutral-900" }}
                  />
                  <p className="text-xs text-neutral-500">
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
                  className="w-full h-48 border-2 border-dashed border-neutral-700 hover:border-primary rounded-xl flex flex-col items-center justify-center bg-neutral-950 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="p-4 bg-neutral-800 rounded-full mb-3">
                    <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-neutral-300">Haz clic para buscar o arrastra un archivo aquí</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    JPG, PNG o WebP (Max 5MB)
                  </p>
                </div>
              )}

              {previewUrl && (
                <div className="relative w-full aspect-video min-h-[200px] bg-black rounded-xl overflow-hidden border border-neutral-800">
                  {activeTab === "photo" ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <video src={previewUrl} controls className="w-full h-full object-contain" />
                  )}
                  <button
                    className="absolute top-2 right-2 bg-neutral-900/80 p-2 rounded-lg text-white hover:bg-red-500 transition-colors"
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
              <div className="space-y-5 bg-neutral-900/50 p-5 rounded-xl border border-neutral-800">
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
                  <Input
                    label="Título (Opcional)"
                    placeholder={activeTab === "photo" ? "Ej. Jugando la final contra..." : "Ej. Highlight Temporada 2024"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    variant="bordered"
                    classNames={{ inputWrapper: "border-neutral-700 bg-neutral-950" }}
                  />
                  <div className="flex flex-wrap gap-2">
                    {titleSuggestions.map((sug, i) => (
                      <button 
                        key={i} 
                        onClick={() => setTitle(sug)}
                        className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded-full transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    label="Texto Alternativo (Alt Text)"
                    placeholder="Describe la imagen para que Google la encuentre..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    variant="bordered"
                    classNames={{ inputWrapper: "border-neutral-700 bg-neutral-950" }}
                    description="Ayuda a los motores de búsqueda a entender de qué trata el contenido."
                  />
                   <div className="flex flex-wrap gap-2">
                    {altTextSuggestions.map((sug, i) => (
                      <button 
                        key={i} 
                        onClick={() => setAltText(sug)}
                        className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded-full transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    label="Etiquetas (Tags)"
                    placeholder="separadas por coma (ej: Delantero, Argentino, Jugador profesional)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    variant="bordered"
                    classNames={{ inputWrapper: "border-neutral-700 bg-neutral-950" }}
                    description="💡 Es clave incluir equipos de tu trayectoria, posiciones en el campo y palabras relacionadas a tu perfil como jugador para mejorar tu visibilidad web."
                  />
                  <button 
                    onClick={() => setTags(tagSuggestions)}
                    className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded-full transition-colors"
                  >
                    + Usar sugeridas ({tagSuggestions})
                  </button>
                </div>

                 {activeTab === "photo" && (
                  <Select
                    label="Uso de la imagen"
                    placeholder="Galería General"
                    selectedKeys={isPrimary ? ["primary"] : ["gallery"]}
                    onChange={(e) => setIsPrimary(e.target.value === "primary")}
                    variant="bordered"
                    classNames={{ trigger: "border-neutral-700 bg-neutral-950" }}
                  >
                    <SelectItem key="gallery">Galería General</SelectItem>
                    <SelectItem key="primary">Foto de Perfil / Portada CV</SelectItem>
                  </Select>
                )}
              </div>

              {/* Legal Disclaimer */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex gap-3 items-start">
                <Checkbox
                  isSelected={acceptedPolicy}
                  onValueChange={setAcceptedPolicy}
                  color="primary"
                  className="mt-1"
                />
                <div className="text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-300 mb-1">Políticas de Uso y Moderación</p>
                  <p>
                    Entiendo que el contenido subido estará visible públicamente en mi perfil de inmediato, 
                    pero será auditado por el equipo de seguridad. <strong>Cualquier imagen o video con contenido explícito, 
                    violento o inapropiado resultará en la eliminación permanente de la cuenta sin derecho a reclamo.</strong>
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="border-t border-neutral-800">
              <Button variant="light" onPress={onClose} disabled={isUploading}>
                Cancelar
              </Button>
              <Button color="primary" onPress={handleUpload} isLoading={isUploading}>
                Subir Archivo
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
