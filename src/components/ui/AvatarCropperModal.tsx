"use client";

import { useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Slider,
} from "@heroui/react";
import { Move, ZoomIn, RefreshCw } from "lucide-react";

import { bhButtonClass } from "@/components/ui/bh-button-class";
import { bhModalClassNames } from "@/lib/ui/heroui-brand";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Source file the user picked. Cleared when modal closes. */
  file: File | null;
  /** Square output size in pixels. Default 480. */
  outputSize?: number;
  /** Output mime type. Default JPEG @ 0.92. */
  outputType?: "image/jpeg" | "image/png" | "image/webp";
  outputQuality?: number;
  /**
   * Called with the cropped Blob. Implementer is responsible for uploading it.
   * Returning a promise lets the modal show its loading state while you upload.
   */
  onConfirm: (blob: Blob) => Promise<void> | void;
};

const PREVIEW_SIZE = 320; // px on screen
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Square-canvas cropper with a circular viewport overlay (avatars are usually
 * rendered round). User can drag to pan and slide to zoom; on confirm we
 * render the visible area to a square output canvas and emit a Blob.
 *
 * Pure canvas — no extra dependencies.
 */
export default function AvatarCropperModal({
  isOpen,
  onOpenChange,
  file,
  outputSize = 480,
  outputType = "image/jpeg",
  outputQuality = 0.92,
  onConfirm,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load file into Image. The "natural" zoom = the cover-fit, so the picture
  // always fills the circle on first paint regardless of source aspect ratio.
  useEffect(() => {
    if (!file || !isOpen) return;
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.onerror = () => setError("No se pudo cargar la imagen.");
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]);

  // Compute the cover-fit base scale (image fully covers PREVIEW_SIZE viewport).
  const coverScale = imageEl
    ? Math.max(PREVIEW_SIZE / imageEl.width, PREVIEW_SIZE / imageEl.height)
    : 1;

  const drawTo = (
    ctx: CanvasRenderingContext2D,
    canvasSize: number,
    scaleFactor: number,
  ) => {
    if (!imageEl) return;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const totalScale = coverScale * zoom * scaleFactor;
    const drawWidth = imageEl.width * totalScale;
    const drawHeight = imageEl.height * totalScale;
    const drawX = (canvasSize - drawWidth) / 2 + pan.x * scaleFactor;
    const drawY = (canvasSize - drawHeight) / 2 + pan.y * scaleFactor;
    ctx.drawImage(imageEl, drawX, drawY, drawWidth, drawHeight);
  };

  // Render preview whenever transforms change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawTo(ctx, PREVIEW_SIZE, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageEl, zoom, pan]);

  // Clamp pan so the image always covers the circle area. The half-overlap
  // is the maximum the image can shift in each direction without revealing
  // empty canvas inside the circle.
  const clampPan = (next: { x: number; y: number }) => {
    if (!imageEl) return next;
    const totalScale = coverScale * zoom;
    const halfImageW = (imageEl.width * totalScale) / 2;
    const halfImageH = (imageEl.height * totalScale) / 2;
    const halfFrame = PREVIEW_SIZE / 2;
    const maxX = Math.max(0, halfImageW - halfFrame);
    const maxY = Math.max(0, halfImageH - halfFrame);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  // Pointer drag — works for mouse + touch + pen.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setPan((p) => clampPan({ x: p.x + e.movementX, y: p.y + e.movementY }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Reset zoom/pan to neutral.
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleConfirm = async () => {
    if (!imageEl) return;
    setBusy(true);
    setError(null);

    try {
      const out = document.createElement("canvas");
      out.width = outputSize;
      out.height = outputSize;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D no disponible.");

      const scaleFactor = outputSize / PREVIEW_SIZE;
      drawTo(ctx, outputSize, scaleFactor);

      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob((b) => resolve(b), outputType, outputQuality),
      );
      if (!blob) throw new Error("No se pudo generar el blob.");

      await onConfirm(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("AvatarCropperModal confirm error", err);
      setError(err instanceof Error ? err.message : "Error al recortar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      placement="center"
      scrollBehavior="inside"
      classNames={bhModalClassNames}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex-col gap-1">
              <h2 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                Ajustar imagen
              </h2>
              <p className="text-[13px] font-normal text-bh-fg-3">
                Arrastrá para encuadrar y usá el slider para acercar. La imagen se
                guarda con un recorte cuadrado centrado en la circunferencia.
              </p>
            </ModalHeader>

            <ModalBody className="space-y-5 py-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-sm text-bh-danger">
                  {error}
                </div>
              )}

              <div className="flex justify-center">
                <div
                  className="relative select-none rounded-bh-md overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{
                    width: PREVIEW_SIZE,
                    height: PREVIEW_SIZE,
                    background:
                      "repeating-conic-gradient(rgba(255,255,255,0.04) 0 25%, rgba(255,255,255,0.02) 0 50%) 50% / 24px 24px",
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  <canvas
                    ref={canvasRef}
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                    className="block"
                    style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                  />

                  {/* Circular overlay: dark mask outside, accent ring on the boundary */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.6) 51%)`,
                    }}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      width: PREVIEW_SIZE,
                      height: PREVIEW_SIZE,
                      border: "2px dashed rgba(204,255,0,0.55)",
                      boxShadow: "0 0 24px rgba(204,255,0,0.18)",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomIn className="h-4 w-4 text-bh-fg-3 shrink-0" />
                  <Slider
                    aria-label="Zoom"
                    minValue={MIN_ZOOM}
                    maxValue={MAX_ZOOM}
                    step={0.01}
                    value={zoom}
                    onChange={(v) => setZoom(Array.isArray(v) ? v[0] : v)}
                    classNames={{
                      track: "bg-white/[0.08]",
                      filler: "bg-bh-lime",
                      thumb: "bg-bh-lime border-2 border-bh-black",
                    }}
                    className="flex-1"
                  />
                  <span className="font-bh-mono text-[11px] text-bh-fg-4 w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px] text-bh-fg-4">
                  <div className="inline-flex items-center gap-1.5">
                    <Move className="h-3 w-3" />
                    Arrastrá la imagen para reposicionarla
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-bh-md border border-white/[0.08] px-2 py-1 text-bh-fg-3 hover:border-white/[0.18] hover:text-bh-fg-1 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Restablecer
                  </button>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="light"
                onPress={onClose}
                isDisabled={busy}
                className={bhButtonClass({ variant: "ghost", size: "sm" })}
              >
                Cancelar
              </Button>
              <Button
                onPress={handleConfirm}
                isLoading={busy}
                isDisabled={!imageEl || busy}
                className={bhButtonClass({ variant: "lime", size: "sm" })}
              >
                Guardar avatar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
