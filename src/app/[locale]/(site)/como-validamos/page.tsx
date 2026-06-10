// app/(site)/como-validamos/page.tsx
// Página /como-validamos — el workflow de validación (scrolljacking estilo n8n).
// Hereda header, ambient y footer del SiteLayout; rompe el contenedor de 1200px
// para ser full-bleed (el stage interno es position: sticky).

import type { Metadata } from "next";

import ValidationFlow from "@/components/site/como-validamos/ValidationFlow";
import { localizedAlternates } from "@/lib/seo/hreflang";
import type { Locale } from "@/i18n/routing";

const TITLE = "¿Cómo validamos?";
const DESCRIPTION =
  "El flujo de validación de 'BallersHub: cada cambio crítico en un perfil pasa por revisión humana, contraste contra +10 fuentes deportivas (Transfermarkt, Sofascore, FBref…) y verificación con agentes de IA (Gemini, Claude, ChatGPT) antes de publicarse.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: localizedAlternates(locale as Locale, "/como-validamos"),
    openGraph: {
      title: `${TITLE} · 'BallersHub`,
      description: DESCRIPTION,
      url: "/como-validamos",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${TITLE} · 'BallersHub`,
      description: DESCRIPTION,
    },
  };
}

export default function ComoValidamosPage() {
  // Full-bleed breakout from the 1200px <main> via negative margin (NOT a
  // transform — keeps the inner `position: sticky` working). `-mt-[6.5rem]`
  // cancels the layout's top padding so the hero starts at the very top, behind
  // the transparent fixed header (which goes solid on scroll).
  return (
    <div className="relative ml-[calc(50%-50vw)] w-screen -mt-[6.5rem]">
      <ValidationFlow />
    </div>
  );
}
