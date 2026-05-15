import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import NewCampaignForm from "./NewCampaignForm";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/marketing"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-bh-fg-3 hover:text-bh-lime"
      >
        <ArrowLeft className="size-3" />
        Volver a campañas
      </Link>

      <header className="space-y-1">
        <h2 className="font-bh-display text-2xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1">
          Nueva campaña
        </h2>
        <p className="text-sm leading-[1.55] text-bh-fg-3">
          Configurá la audiencia, el template y el contenido. El preview se actualiza en vivo —
          el envío real solo dispara cuando hagas click en &ldquo;Enviar ahora&rdquo;.
        </p>
      </header>

      <NewCampaignForm />
    </div>
  );
}
