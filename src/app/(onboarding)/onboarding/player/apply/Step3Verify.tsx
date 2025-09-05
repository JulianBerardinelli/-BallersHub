"use client";

import * as React from "react";
import { Form, Button, Checkbox, Chip } from "@heroui/react";
import KycUploader from "@/app/(onboarding)/onboarding/KycUploader";
import type { CountryPick } from "@/components/common/CountryMultiPicker";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Tipos mínimos esperados desde Step1/Step2
export type Step1Data = {
  fullName: string;
  nationalities: CountryPick[]; // [{code,name}]
  birthDate: any | null;        // se guarda serializado en notes
  position: { role: "ARQ" | "DEF" | "MID" | "DEL"; subs: string[] };
  heightCm: number | null;
  weightKg: number | null;
};

export type TeamApproved = {
  mode: "approved";
  teamId: string;
  teamName: string;
  country?: string | null;
  countryCode?: string | null;
  teamCrest?: string | null;
};
export type TeamNew = {
  mode: "new";
  name: string;
  country?: string | null;
  countryCode?: string | null;
  tmUrl?: string | null;
};
export type TeamFree = { mode: "free" };

export type CareerItemInput = {
  id: string;
  club: string;
  division?: string | null;
  start_year?: number | null;
  end_year?: number | null;
  team_id?: string | null;
  team_meta?: { slug?: string | null; country_code?: string | null; crest_url?: string | null } | null;
  proposed?: { country?: CountryPick | null; tmUrl?: string | null } | null;
  confirmed?: boolean;
  source?: "current" | "manual";
};

export type Step2Data = {
  freeAgent: boolean;
  team: TeamApproved | TeamNew | TeamFree | null;
  career: CareerItemInput[];
  transfermarkt?: string | null; // TM jugador
  besoccer?: string | null;      // se persiste en external_profile_url si hay
  social?: string | null;        // fallback si no hay BeSoccer
};

export default function Step3Verify({
  step1,
  step2,
  onBack,
  onSent,
}: {
  step1: Step1Data;
  step2: Step2Data;
  onBack: () => void;
  onSent: (applicationId: string) => void;
}) {
  const router = useRouter();

  const [idDocKey, setIdDocKey] = React.useState<string | null>(null);
  const [selfieKey, setSelfieKey] = React.useState<string | null>(null);
  const [agree, setAgree] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function onUploaded(p: { idDocKey?: string; selfieKey?: string }) {
    if (p.idDocKey) setIdDocKey(p.idDocKey);
    if (p.selfieKey) setSelfieKey(p.selfieKey);
  }

  async function handleSubmit() {
    setError(null);
    if (!idDocKey || !selfieKey || !agree) {
      setError("Falta subir documento/selfie o aceptar condiciones.");
      return;
    }

    setSending(true);
    try {
      // 1) token del usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("No hay sesión activa.");
        setSending(false);
        return;
      }

      // 2) armo el payload
      const payload = { step1, step2, kyc: { idDocKey, selfieKey } };

      // 3) POST al endpoint (sólo Bearer, sin cookies)
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* puede venir vacío */ }

      // 4) manejar respuestas
      if (res.status === 201 && data?.id) {
        onSent?.(data.id);
        router.replace("/dashboard?applied=1");
        return;
      }
      // Caso: ya hay una pending — lo tratamos como "ok" para UX
      if (res.status === 409 && data?.id) {
        onSent?.(data.id);
        router.replace("/dashboard?applied=1");
        return;
      }

      throw new Error(data?.error || `HTTP ${res.status}${raw ? `: ${raw.slice(0, 160)}` : ""}`);
    } catch (e: any) {
      setError(e?.message ?? "Error inesperado.");
    } finally {
      setSending(false);
    }
  }

  const canSend = !!idDocKey && !!selfieKey && agree && !sending;

  return (
    <div className="space-y-6">
      <Form className="grid gap-6">
        <div className="rounded-xl border p-4 grid gap-3">
          <h3 className="text-base font-medium">Verificación de identidad</h3>

          <KycUploader onUploaded={onUploaded} />

          <div className="flex flex-wrap gap-2">
            <Chip size="sm" color={idDocKey ? "success" : "default"} variant="flat">
              {idDocKey ? "Documento subido" : "Documento pendiente"}
            </Chip>
            <Chip size="sm" color={selfieKey ? "success" : "default"} variant="flat">
              {selfieKey ? "Selfie subida" : "Selfie pendiente"}
            </Chip>
          </div>

          <Checkbox isSelected={agree} onValueChange={setAgree}>
            Acepto Términos y Política de Privacidad
          </Checkbox>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex justify-between">
          <Button variant="flat" onPress={onBack}>Volver</Button>
          <Button color="primary" onPress={handleSubmit} isLoading={sending} isDisabled={!canSend}>
            Enviar solicitud
          </Button>
        </div>
      </Form>
    </div>
  );
}
