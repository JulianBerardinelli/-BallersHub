"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Newspaper, LayoutGrid } from "lucide-react";
import { updatePressLayoutAction } from "@/app/actions/template-settings";
import { useNotificationContext, profileNotification } from "@/modules/notifications";

export type NotesLayout = "newspaper" | "cards";

const OPTIONS: Array<{
  id: NotesLayout;
  icon: React.ReactNode;
  preview: React.ReactNode;
}> = [
  {
    id: "newspaper",
    icon: <Newspaper className="h-4 w-4" />,
    preview: <NewspaperPreview />,
  },
  {
    id: "cards",
    icon: <LayoutGrid className="h-4 w-4" />,
    preview: <CardsPreview />,
  },
];

export default function NotesLayoutPicker({
  initialLayout,
}: {
  initialLayout: NotesLayout;
}) {
  const t = useTranslations("dashEditProfile");
  const router = useRouter();
  const { enqueue } = useNotificationContext();
  const [isPending, startTransition] = useTransition();
  const [layout, setOptimisticLayout] = useOptimistic(
    initialLayout,
    (_state, next: NotesLayout) => next,
  );

  const handleSelect = (next: NotesLayout) => {
    if (next === layout || isPending) return;
    startTransition(async () => {
      setOptimisticLayout(next);
      try {
        await updatePressLayoutAction({ layout: next });
        enqueue(
          profileNotification.updated({
            userName: t("media.notesLayout.notificationName"),
            sectionLabel: t("media.notesLayout.notificationSection"),
            changedFields: [
              next === "cards"
                ? t("media.notesLayout.cardsTitle")
                : t("media.notesLayout.newspaperTitle"),
            ],
          }),
        );
        router.refresh();
      } catch (err) {
        console.error("Fallo al actualizar layout de notas", err);
        alert(t("media.notesLayout.updateError"));
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-bh-lg border border-white/[0.06] bg-bh-surface-1/40 p-4">
      <div className="flex flex-col gap-1">
        <p className="font-bh-heading text-[13px] font-semibold text-bh-fg-1">
          {t("media.notesLayout.heading")}
        </p>
        <p className="text-[12px] leading-[1.55] text-bh-fg-3">
          {t("media.notesLayout.help", { slug: "slug" })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const selected = layout === opt.id;
          const optTitle =
            opt.id === "cards"
              ? t("media.notesLayout.cardsTitle")
              : t("media.notesLayout.newspaperTitle");
          const optDescription =
            opt.id === "cards"
              ? t("media.notesLayout.cardsDescription")
              : t("media.notesLayout.newspaperDescription");
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => handleSelect(opt.id)}
              className={`group relative flex flex-col gap-3 rounded-bh-md border p-4 text-left transition-all ${
                selected
                  ? "border-bh-lime/60 bg-[rgba(204,255,0,0.05)] shadow-[0_0_0_1px_rgba(204,255,0,0.15)]"
                  : "border-white/[0.08] bg-bh-surface-2/40 hover:border-white/[0.18] hover:bg-bh-surface-2/60"
              } ${isPending ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      selected
                        ? "bg-bh-lime/15 text-bh-lime"
                        : "bg-white/[0.05] text-bh-fg-3 group-hover:text-bh-fg-1"
                    }`}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={`font-bh-heading text-[13px] font-semibold ${
                      selected ? "text-bh-fg-1" : "text-bh-fg-2"
                    }`}
                  >
                    {optTitle}
                  </span>
                </div>
                {selected && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bh-lime text-black">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </div>

              <div className="aspect-[16/9] w-full overflow-hidden rounded-bh-sm border border-white/[0.06] bg-black/40">
                {opt.preview}
              </div>

              <p className="text-[11.5px] leading-[1.5] text-bh-fg-4">
                {optDescription}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewspaperPreview() {
  return (
    <div className="relative h-full w-full bg-[#f4f4f0] p-2">
      <div className="mb-1 flex items-end justify-between border-b border-black/60 pb-1">
        <div className="font-serif text-[6px] font-black uppercase leading-none text-black/90">
          Daily Press
        </div>
        <div className="font-serif text-[4px] uppercase text-black/50">Vol. 1</div>
      </div>
      <div className="grid grid-cols-12 gap-[2px]">
        <div className="col-span-8 space-y-[2px] pr-1">
          <div className="h-1 w-3/4 bg-black/70" />
          <div className="h-1 w-2/3 bg-black/70" />
          <div className="mt-[2px] h-6 w-full bg-black/20" />
        </div>
        <div className="col-span-4 space-y-[2px] border-l border-black/20 pl-1">
          <div className="h-[3px] w-full bg-black/60" />
          <div className="h-[3px] w-5/6 bg-black/40" />
          <div className="mt-[1px] h-4 w-full bg-black/15" />
        </div>
        <div className="col-span-4 space-y-[2px] border-t border-black/20 pt-[2px] pr-1">
          <div className="h-[3px] w-full bg-black/60" />
          <div className="h-3 w-full bg-black/15" />
        </div>
        <div className="col-span-4 space-y-[2px] border-l border-t border-black/20 pl-1 pt-[2px] pr-1">
          <div className="h-[3px] w-full bg-black/60" />
          <div className="h-3 w-full bg-black/15" />
        </div>
        <div className="col-span-4 space-y-[2px] border-l border-t border-black/20 pl-1 pt-[2px]">
          <div className="h-[3px] w-full bg-black/60" />
          <div className="h-3 w-full bg-black/15" />
        </div>
      </div>
    </div>
  );
}

function CardsPreview() {
  return (
    <div className="grid h-full w-full grid-cols-3 gap-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-[2px] border border-white/[0.08] bg-white/[0.04]"
        >
          <div className="h-3 w-full bg-white/[0.08]" />
          <div className="flex-1 space-y-[2px] p-[3px]">
            <div className="h-[2px] w-full bg-white/30" />
            <div className="h-[2px] w-2/3 bg-white/20" />
          </div>
        </div>
      ))}
    </div>
  );
}
