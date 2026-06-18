"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import { deleteCoachMedia } from "@/app/actions/coach-media";

export type CoachMediaItem = {
  id: string;
  type: "photo" | "video" | "doc";
  url: string;
  title: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  seasonYear: number | null;
  provider: string | null;
};

export default function CoachMediaManager({ items }: { items: CoachMediaItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const photos = items.filter((i) => i.type === "photo");
  const videos = items.filter((i) => i.type === "video");

  async function upload(form: FormData) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/coach/media/upload", { method: "POST", body: form });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? "No se pudo subir." });
        return false;
      }
      setMsg({ ok: true, text: "Subido. Queda en revisión hasta que el equipo lo apruebe." });
      router.refresh();
      return true;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error inesperado." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await deleteCoachMedia(id);
    setBusy(false);
    if (res.success) router.refresh();
    else setMsg({ ok: false, text: res.message ?? "No se pudo eliminar." });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-bh-display text-xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
          Multimedia
        </h2>
        <p className="text-sm text-bh-fg-3">
          Fotos y videos de tu trabajo. Cada archivo se publica recién cuando el equipo lo aprueba.
        </p>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-bh-success" : "text-bh-danger"}`}>{msg.text}</p>
      )}

      <PhotoUploader busy={busy} onUpload={upload} />
      <VideoUploader busy={busy} onUpload={upload} />

      <MediaSection title="Fotos" empty="Todavía no subiste fotos.">
        {photos.map((item) => (
          <MediaCard key={item.id} item={item} busy={busy} onDelete={() => onDelete(item.id)} />
        ))}
      </MediaSection>

      <MediaSection title="Videos" empty="Todavía no agregaste videos.">
        {videos.map((item) => (
          <MediaCard key={item.id} item={item} busy={busy} onDelete={() => onDelete(item.id)} />
        ))}
      </MediaSection>
    </div>
  );
}

function PhotoUploader({
  busy,
  onUpload,
}: {
  busy: boolean;
  onUpload: (form: FormData) => Promise<boolean>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("type", "photo");
    form.set("file", file);
    await onUpload(form);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
        Subir foto
      </h3>
      <p className="text-[12px] text-bh-fg-3">JPG, PNG, WebP o AVIF · hasta 5MB.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={onPick}
      />
      <div>
        <Button
          variant="flat"
          isDisabled={busy}
          onPress={() => inputRef.current?.click()}
          className="rounded-bh-md border border-white/[0.12] bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-1 hover:border-white/[0.24]"
        >
          Elegir imagen
        </Button>
      </div>
    </section>
  );
}

function VideoUploader({
  busy,
  onUpload,
}: {
  busy: boolean;
  onUpload: (form: FormData) => Promise<boolean>;
}) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [season, setSeason] = React.useState("");

  const urlOk = /^https?:\/\/[^ "]+$/i.test(url.trim());

  async function onAdd() {
    const form = new FormData();
    form.set("type", "video");
    form.set("url", url.trim());
    if (title.trim()) form.set("title", title.trim());
    if (season.trim()) form.set("seasonYear", season.trim());
    const ok = await onUpload(form);
    if (ok) {
      setTitle("");
      setUrl("");
      setSeason("");
    }
  }

  return (
    <section className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
        Agregar video
      </h3>
      <p className="text-[12px] text-bh-fg-3">Pegá el link de YouTube o Vimeo.</p>
      <div className="grid auto-rows-fr gap-3 grid-cols-1 sm:grid-cols-2">
        <FormField
          id="coach-video-url"
          label="Link del video"
          placeholder="https://youtube.com/watch?v=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <FormField
          id="coach-video-title"
          label="Título (opcional)"
          placeholder="Ej: Análisis táctico vs Boca"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <FormField
          id="coach-video-season"
          type="number"
          label="Temporada (año, opcional)"
          placeholder="2024"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        />
      </div>
      <div>
        <Button
          isDisabled={busy || !urlOk}
          onPress={onAdd}
          className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black hover:bg-[#d8ff26]"
        >
          Agregar video
        </Button>
      </div>
    </section>
  );
}

function MediaSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <section className="grid gap-3 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
        {title}
      </h3>
      {hasChildren ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      ) : (
        <p className="text-[12px] text-bh-fg-4">{empty}</p>
      )}
    </section>
  );
}

function MediaCard({
  item,
  busy,
  onDelete,
}: {
  item: CoachMediaItem;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-bh-md border border-white/[0.06] bg-transparent p-3">
      <div className="relative aspect-video overflow-hidden rounded-bh-sm border border-white/[0.06] bg-bh-surface-2">
        {item.type === "photo" ? (
          <Image
            src={item.url}
            alt={item.title ?? "Foto del entrenador"}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-full items-center justify-center text-[12px] text-bh-fg-3 hover:text-bh-lime"
          >
            ▶ Ver video
          </a>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusChip status={item.status} />
        <Button
          size="sm"
          variant="flat"
          isDisabled={busy}
          onPress={onDelete}
          className="h-7 rounded-bh-md border border-white/[0.08] bg-transparent px-3 text-[12px] text-bh-fg-3 hover:border-bh-danger hover:text-bh-danger"
        >
          Eliminar
        </Button>
      </div>
      {item.title && <p className="truncate text-[12px] text-bh-fg-2">{item.title}</p>}
      {item.status === "rejected" && item.rejectionReason && (
        <p className="text-[11px] text-bh-danger">Motivo: {item.rejectionReason}</p>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: CoachMediaItem["status"] }) {
  const map: Record<CoachMediaItem["status"], { label: string; cls: string }> = {
    pending: { label: "En revisión", cls: "border-bh-warning/25 bg-bh-warning/10 text-bh-warning" },
    approved: { label: "Publicada", cls: "border-bh-success/25 bg-bh-success/10 text-bh-success" },
    rejected: { label: "Rechazada", cls: "border-bh-danger/25 bg-bh-danger/10 text-bh-danger" },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-bh-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${cls}`}
    >
      {label}
    </span>
  );
}
