"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { Lock, Mail, MessageCircle, ArrowUpRight, Check } from "lucide-react";

export type ContactChannelKind = "email" | "whatsapp";

export type PortfolioContactChannel = {
  kind: ContactChannelKind;
  label: string;
  value: string;
  href: string;
};

type Props = {
  playerSlug: string;
  playerName: string;
  channels: PortfolioContactChannel[];
  unlocked: boolean;
};

const CHANNEL_BRAND: Record<ContactChannelKind, { tag: string; gradient: string }> = {
  email: { tag: "Mail", gradient: "from-[var(--theme-accent)]/30 to-transparent" },
  whatsapp: { tag: "WhatsApp", gradient: "from-[#25D36622] to-transparent" },
};

function ChannelIcon({ kind, className }: { kind: ContactChannelKind; className?: string }) {
  switch (kind) {
    case "email":
      return <Mail className={className} aria-hidden />;
    case "whatsapp":
      return <MessageCircle className={className} aria-hidden />;
  }
}

export default function PortfolioContact({ playerSlug, playerName, channels, unlocked }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });

  const headerY = useTransform(scrollYProgress, [0, 0.45], [40, 0]);
  const headerOpacity = useTransform(scrollYProgress, [0, 0.25, 0.5], [0, 1, 1]);
  const ruleScaleX = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);

  const firstName = playerName.split(" ")[0] || playerName;

  return (
    <section
      ref={sectionRef}
      id="contact"
      aria-label={`Contacto de ${playerName}`}
      className="relative w-full pb-8 md:pb-16"
    >
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-[var(--theme-accent)]/[0.05] blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[760px]">
        <motion.header
          style={{ y: headerY, opacity: headerOpacity }}
          className="mb-6 md:mb-10 flex items-end justify-between gap-6"
        >
          <div className="flex flex-col">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-[var(--theme-accent)] mb-1.5">
              Contacto
            </span>
            <h2 className="text-2xl md:text-4xl font-black font-heading text-white uppercase leading-[0.9]">
              Conectá con {firstName}
            </h2>
          </div>
          <motion.div
            style={{ scaleX: ruleScaleX, transformOrigin: "right" }}
            className="hidden md:block flex-1 max-w-[180px] h-[2px] bg-[var(--theme-accent)] mb-2"
          />
        </motion.header>

        {unlocked ? (
          <ContactGrid playerSlug={playerSlug} channels={channels} />
        ) : (
          <LockedStage playerSlug={playerSlug} channels={channels} />
        )}
      </div>
    </section>
  );
}

function ContactGrid({
  playerSlug,
  channels,
}: {
  playerSlug: string;
  channels: PortfolioContactChannel[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {channels.map((channel) => (
        <ContactCard
          key={channel.kind}
          playerSlug={playerSlug}
          channel={channel}
          interactive
        />
      ))}
    </div>
  );
}

function LockedStage({
  playerSlug,
  channels,
}: {
  playerSlug: string;
  channels: PortfolioContactChannel[];
}) {
  // Stack the blurred preview and the form panel in the same grid cell so
  // the container's height grows to fit the form, not just the (small) grid.
  return (
    <div className="relative grid overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015] min-h-[420px]">
      {/* Blurred preview cards as backdrop (fills the cell) */}
      <div
        className="pointer-events-none select-none [grid-area:1/1] flex items-center justify-center p-4 md:p-6 [filter:blur(12px)_saturate(0.7)] opacity-50"
        aria-hidden
      >
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {channels.map((channel) => (
            <ContactCard
              key={channel.kind}
              playerSlug={playerSlug}
              channel={channel}
              interactive={false}
            />
          ))}
        </div>
      </div>

      {/* Soft vignette over the blur for legibility of the form */}
      <div
        className="pointer-events-none [grid-area:1/1] bg-gradient-to-b from-black/40 via-black/60 to-black/75"
        aria-hidden
      />

      {/* Centered form panel (same cell, on top) */}
      <div className="[grid-area:1/1] grid place-items-center p-4 md:p-6">
        <LockedPanel playerSlug={playerSlug} />
      </div>
    </div>
  );
}

function ContactCard({
  playerSlug,
  channel,
  interactive,
}: {
  playerSlug: string;
  channel: PortfolioContactChannel;
  interactive: boolean;
}) {
  const brand = CHANNEL_BRAND[channel.kind];

  function handleClick() {
    if (!interactive) return;
    fetch(`/api/portfolio/${encodeURIComponent(playerSlug)}/contact-click`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ platform: channel.kind }),
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <a
      href={interactive ? channel.href : undefined}
      target={interactive && channel.kind === "whatsapp" ? "_blank" : undefined}
      rel={interactive && channel.kind === "whatsapp" ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      className={[
        "group relative flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]",
        "p-5 md:p-6 overflow-hidden",
        "transition-all duration-300 ease-[cubic-bezier(0.25,0,0,1)]",
        interactive
          ? "hover:-translate-y-0.5 hover:border-[var(--theme-accent)]/40 hover:bg-white/[0.04]"
          : "",
      ].join(" ")}
      tabIndex={interactive ? 0 : -1}
      aria-label={`Contactar por ${channel.label}: ${channel.value}`}
    >
      {/* Branded radial wash on hover */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${brand.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
      />

      <div className="relative z-10 flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm transition-colors duration-300 group-hover:border-[var(--theme-accent)]/50">
          <ChannelIcon
            kind={channel.kind}
            className="h-5 w-5 text-white/90 transition-colors duration-300 group-hover:text-[var(--theme-accent)]"
          />
        </span>
        <ArrowUpRight
          className="h-4 w-4 text-white/30 transition-all duration-300 group-hover:text-[var(--theme-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
          {brand.tag}
        </span>
        <span className="text-base md:text-lg font-medium text-white truncate">
          {channel.value}
        </span>
      </div>

      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] w-0 bg-[var(--theme-accent)] transition-[width] duration-500 ease-out group-hover:w-full"
      />
    </a>
  );
}

function LockedPanel({ playerSlug }: { playerSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Ingresá un email válido.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/portfolio/${encodeURIComponent(playerSlug)}/lead`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "No pudimos guardar tu email. Probá nuevamente.");
          return;
        }
        setSubmitted(true);
        setTimeout(() => router.refresh(), 600);
      } catch {
        setError("No pudimos conectar con el servidor. Revisá tu conexión.");
      }
    });
  }

  return (
    <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.12] bg-black/70 p-5 md:p-6 backdrop-blur-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/10">
          <Lock className="h-3.5 w-3.5 text-[var(--theme-accent)]" aria-hidden />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--theme-accent)]">
          Acceso reservado
        </span>
      </div>

      {submitted ? (
        <div className="flex items-start gap-3 py-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--theme-accent)]/20">
            <Check className="h-3.5 w-3.5 text-[var(--theme-accent)]" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-white">¡Listo!</h3>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              Estamos desbloqueando los datos…
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-white/70 leading-relaxed">
            Dejanos tu email para ver los canales de contacto. Te avisamos cuando se sumen nuevos perfiles.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
            <label htmlFor="lead-email" className="sr-only">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="tu@email.com"
              className={[
                "w-full rounded-lg border bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none",
                "transition-colors duration-150",
                error
                  ? "border-red-500/60 focus:border-red-500"
                  : "border-white/15 focus:border-[var(--theme-accent)]",
              ].join(" ")}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "lead-email-error" : undefined}
              disabled={isPending}
            />

            {error ? (
              <p id="lead-email-error" className="text-[11px] text-red-400">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className={[
                "group relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em]",
                "bg-[var(--theme-accent)] text-black",
                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_var(--theme-accent)]",
                "disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              {isPending ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-black/40 border-t-black"
                  aria-hidden
                />
              ) : (
                <>
                  Desbloquear contacto
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </>
              )}
            </button>

            <p className="text-[10px] text-white/40 leading-relaxed text-center">
              ¿Ya tenés cuenta?{" "}
              <a
                href={`/auth/sign-in?redirect=/${encodeURIComponent(playerSlug)}`}
                className="text-white/70 underline-offset-2 hover:underline hover:text-white"
              >
                Iniciá sesión
              </a>
            </p>
          </form>
        </>
      )}
    </div>
  );
}
