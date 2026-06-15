import { getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";

type TestimonialKey = "maria" | "sebastian";
const TESTIMONIAL_KEYS: TestimonialKey[] = ["maria", "sebastian"];

export default async function TestimonialsPreview() {
  const t = await getTranslations("home.testimonials");
  return (
    <section className="space-y-8">
      <header className="flex items-start gap-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-bh-md border border-[rgba(204,255,0,0.22)] bg-[rgba(204,255,0,0.08)] text-bh-lime">
          <Quote className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
            {t("title")}
          </h2>
          <p className="text-sm text-bh-fg-3">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {TESTIMONIAL_KEYS.map((key) => {
          const name = t(`items.${key}.name`);
          const role = t(`items.${key}.role`);
          const quote = t(`items.${key}.quote`);
          return (
            <figure
              key={key}
              className="bh-card-lift flex h-full flex-col justify-between gap-5 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-6"
            >
              <blockquote className="text-sm leading-[1.6] text-bh-fg-2">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <figcaption>
                <div className="font-bh-heading text-base font-semibold text-bh-fg-1">
                  {name}
                </div>
                <div className="text-xs text-bh-fg-3">{role}</div>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
