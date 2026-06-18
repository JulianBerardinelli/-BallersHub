"use client";

import * as React from "react";
import { Form, Button, Checkbox, Chip } from "@heroui/react";
import KycUploader from "@/app/[locale]/(onboarding)/onboarding/KycUploader";
import { supabase } from "@/lib/supabase/client";
import { onboardingNotification, useNotificationContext } from "@/modules/notifications";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Step1Data } from "./Step1Identity";
import type { Step2Data } from "./Step2Career";

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
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { enqueue } = useNotificationContext();

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
      setError(t("coachApply.step3.errorKycOrTerms"));
      return;
    }

    setSending(true);
    try {
      // 1) token del usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError(t("coachApply.step3.errorNoSession"));
        setSending(false);
        return;
      }

      // 2) armo el payload (career[] + licenses[] viajan dentro de step2)
      const payload = { step1, step2, kyc: { idDocKey, selfieKey } };

      // 3) POST al endpoint del coach (sólo Bearer, sin cookies)
      const res = await fetch("/api/onboarding/coach/submit", {
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

      // 4) manejar respuestas — 201 (creada) y 409 (ya hay pending) son OK para UX
      if ((res.status === 201 || res.status === 409) && data?.id) {
        enqueue(
          onboardingNotification.submitted({
            userName: step1.fullName || undefined,
            requestId: data.id,
          }),
        );
        onSent?.(data.id);
        router.replace("/dashboard?applied=1");
        return;
      }

      throw new Error(data?.error || `HTTP ${res.status}${raw ? `: ${raw.slice(0, 160)}` : ""}`);
    } catch (e: any) {
      setError(e?.message ?? t("coachApply.step3.errorUnexpected"));
    } finally {
      setSending(false);
    }
  }

  const canSend = !!idDocKey && !!selfieKey && agree && !sending;

  return (
    <div className="space-y-6">
      <Form className="grid gap-6">
        <div className="grid gap-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
            {t("coachApply.step3.title")}
          </h3>

          <KycUploader onUploaded={onUploaded} />

          <div className="flex flex-wrap gap-2">
            <Chip
              size="sm"
              variant="flat"
              className={
                idDocKey
                  ? "border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.12)] text-bh-success"
                  : "border border-white/[0.12] bg-white/[0.06] text-bh-fg-3"
              }
            >
              {idDocKey ? t("coachApply.step3.docUploaded") : t("coachApply.step3.docPending")}
            </Chip>
            <Chip
              size="sm"
              variant="flat"
              className={
                selfieKey
                  ? "border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.12)] text-bh-success"
                  : "border border-white/[0.12] bg-white/[0.06] text-bh-fg-3"
              }
            >
              {selfieKey ? t("coachApply.step3.selfieUploaded") : t("coachApply.step3.selfiePending")}
            </Chip>
          </div>

          <Checkbox
            isSelected={agree}
            onValueChange={setAgree}
            classNames={{
              label: "text-[13px] text-bh-fg-2",
              wrapper:
                "before:border-white/[0.18] after:bg-bh-lime group-data-[selected=true]:after:bg-bh-lime",
            }}
          >
            {t("coachApply.step3.agree")}
          </Checkbox>

          {error && <p className="text-sm text-bh-danger">{error}</p>}
        </div>

        <div className="flex justify-between">
          <Button
            variant="flat"
            onPress={onBack}
            className="rounded-bh-md border border-bh-fg-4 bg-transparent px-5 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            {t("coachApply.step3.back")}
          </Button>
          <Button
            onPress={handleSubmit}
            isLoading={sending}
            isDisabled={!canSend}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40 data-[disabled=true]:shadow-none data-[disabled=true]:hover:translate-y-0"
          >
            {t("coachApply.step3.submit")}
          </Button>
        </div>
      </Form>
    </div>
  );
}
