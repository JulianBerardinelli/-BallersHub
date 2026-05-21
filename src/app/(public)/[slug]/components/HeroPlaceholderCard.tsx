"use client";

// Shown when a Pro-tier player has the Pro Athlete layout selected but
// hasn't uploaded their hero PNG yet. The card has four variants keyed
// off the viewer:
//
//   • owner   — the profile owner. Shows the technical "upload your
//               recorte" instructions + CTAs to Multimedia / switch to
//               Free Editorial.
//   • guest   — anonymous visitor. Shows a polished "perfil en
//               preparación" placeholder + CTAs "Volver al inicio" /
//               "Unete a 'BallersHub".
//   • player  — logged-in visitor with a player profile. Shows the
//               preparation placeholder + CTAs "Volver al dashboard" /
//               "Activá Pro Player".
//   • manager — logged-in visitor with a manager/agency role. Shows the
//               preparation placeholder + CTAs "Volver al dashboard" /
//               "Activá Pro Agencia".
//
// Why client-side: the public portfolio route uses ISR (revalidate=3600).
// Reading cookies in the RSC would kill the cache for every visitor. We
// SSR the guest variant (safe to expose to anyone) and swap to the
// matching variant after `supabase.auth.getUser()` resolves on the
// client. Owners see a sub-second flicker from guest → owner; that's
// acceptable because the owner already knows the profile is incomplete.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Crown,
  Home,
  ImagePlus,
  LayoutDashboard,
} from "lucide-react";
import { bhButtonClass } from "@/components/ui/bh-button-class";
import { supabase } from "@/lib/supabase/client";

type ViewerKind = "guest" | "player" | "manager" | "owner";

export default function HeroPlaceholderCard({
  ownerUserId,
  playerName,
}: {
  ownerUserId: string;
  playerName: string;
}) {
  const [viewer, setViewer] = useState<ViewerKind>("guest");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!auth.user) {
          setViewer("guest");
          return;
        }
        if (auth.user.id === ownerUserId) {
          setViewer("owner");
          return;
        }
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (cancelled) return;
        setViewer(profile?.role === "manager" ? "manager" : "player");
      } catch {
        // Network / RLS errors fall back to the safe guest variant.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerUserId]);

  const firstName = playerName.split(/\s+/)[0] || "El jugador";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur md:p-10">
        {/* Ambient lime glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-50"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, rgba(204,255,0,0.16) 0%, transparent 70%)",
          }}
        />

        <RadarAnimation />

        {viewer === "owner" ? (
          <OwnerView />
        ) : (
          <VisitorView viewer={viewer} firstName={firstName} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Radar / scouting sweep — CSS-only, no GIF, no <Loader />. A rotating
// conic-gradient that mimics a stadium spotlight or a scouting radar,
// with a pulsing lime core to imply something is being prepared.
// ---------------------------------------------------------------------

function RadarAnimation() {
  return (
    <div
      aria-hidden
      className="relative mx-auto mb-6 h-28 w-28 md:mb-8 md:h-32 md:w-32"
    >
      {/* Outer slow ping ring */}
      <span
        className="absolute inset-0 rounded-full border border-bh-lime/30 animate-ping"
        style={{ animationDuration: "2.6s" }}
      />
      {/* Mid stable ring */}
      <span className="absolute inset-2 rounded-full border border-bh-lime/35" />
      {/* Rotating conic sweep, masked to a ring shape */}
      <span
        className="absolute inset-1 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, rgba(204,255,0,0.45) 22%, transparent 55%)",
          animation: "bh-radar-spin 3.6s linear infinite",
          WebkitMask:
            "radial-gradient(circle, transparent 40%, black 41%, black 100%)",
          mask: "radial-gradient(circle, transparent 40%, black 41%, black 100%)",
        }}
      />
      {/* Pulsing core dot */}
      <span
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bh-lime shadow-[0_0_18px_rgba(204,255,0,0.6)] animate-pulse"
        style={{ animationDuration: "2s" }}
      />
      {/* Local keyframes so we don't depend on global CSS */}
      <style>{`
        @keyframes bh-radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------
// Visitor view (guest / player / manager)
// ---------------------------------------------------------------------

function VisitorView({
  viewer,
  firstName,
}: {
  viewer: ViewerKind;
  firstName: string;
}) {
  return (
    <div className="relative space-y-5 text-center">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-lime/30 bg-bh-lime/10 px-3 py-1 font-bh-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bh-lime">
          Perfil en preparación
        </span>
        <h2 className="mt-3 font-bh-display text-2xl font-black uppercase leading-tight text-bh-fg-1 md:text-3xl">
          {firstName} está trabajando en su perfil
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-[1.6] text-bh-fg-3">
          Pronto vas a ver acá su dossier deportivo completo: trayectoria,
          estadísticas, video, prensa y galería. Mientras tanto, explorá el
          resto del ecosistema.
        </p>
      </div>
      <VisitorCtas viewer={viewer} />
    </div>
  );
}

function VisitorCtas({ viewer }: { viewer: ViewerKind }) {
  if (viewer === "manager") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 pt-2 sm:flex-row sm:gap-3">
        <Link
          href="/dashboard"
          className={bhButtonClass({ variant: "outline", size: "md" })}
        >
          <LayoutDashboard size={15} />
          Volver al dashboard
        </Link>
        <Link
          href="/pricing?audience=agency"
          className={bhButtonClass({ variant: "lime", size: "md" })}
        >
          <Crown size={15} />
          Activá Pro Agencia
        </Link>
      </div>
    );
  }

  if (viewer === "player") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 pt-2 sm:flex-row sm:gap-3">
        <Link
          href="/dashboard"
          className={bhButtonClass({ variant: "outline", size: "md" })}
        >
          <LayoutDashboard size={15} />
          Volver al dashboard
        </Link>
        <Link
          href="/pricing?audience=player"
          className={bhButtonClass({ variant: "lime", size: "md" })}
        >
          <Crown size={15} />
          Activá Pro Player
        </Link>
      </div>
    );
  }

  // guest (default, SSR-safe)
  return (
    <div className="flex flex-col items-center justify-center gap-2 pt-2 sm:flex-row sm:gap-3">
      <Link
        href="/"
        className={bhButtonClass({ variant: "outline", size: "md" })}
      >
        <Home size={15} />
        Volver al inicio
      </Link>
      <Link
        href="/auth/sign-up"
        className={bhButtonClass({ variant: "lime", size: "md" })}
      >
        Unete a &apos;BallersHub
        <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------
// Owner view — the original technical placeholder
// ---------------------------------------------------------------------

function OwnerView() {
  return (
    <div className="relative space-y-5 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bh-lime/30 bg-bh-lime/10 px-3 py-1 font-bh-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-bh-lime">
        <ImagePlus size={11} />
        Hero asset pendiente
      </span>
      <div>
        <h2 className="font-bh-display text-2xl font-black uppercase leading-tight text-bh-fg-1 md:text-3xl">
          Subí tu recorte para activar la plantilla Pro
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-[1.6] text-bh-fg-3">
          La plantilla{" "}
          <span className="font-semibold text-bh-fg-1">Pro Athlete</span>{" "}
          necesita un PNG con tu silueta recortada para renderizar el hero
          cinemático. Cargalo desde la sección{" "}
          <span className="font-semibold text-bh-fg-1">Multimedia</span> del
          dashboard y tu perfil público se actualizará al instante. Si
          preferís publicar ya sin foto, podés cambiar a la plantilla{" "}
          <span className="font-semibold text-bh-fg-1">Free Editorial</span>{" "}
          desde Estilos.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 pt-1 sm:flex-row sm:gap-3">
        <Link
          href="/dashboard/edit-profile/multimedia"
          className={bhButtonClass({ variant: "lime", size: "md" })}
        >
          Ir a Multimedia
          <ArrowUpRight size={15} />
        </Link>
        <Link
          href="/dashboard/edit-template/styles"
          className={bhButtonClass({ variant: "outline", size: "md" })}
        >
          Cambiar a Free Editorial
        </Link>
      </div>
    </div>
  );
}
