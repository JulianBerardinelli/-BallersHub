"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Save, AlertTriangle } from "lucide-react";
import {
  createCampaign,
  dispatchCampaignNow,
  estimateAudience,
  previewTemplate,
  type AudienceEstimate,
} from "../actions";
import type { AudienceFilter, AudienceSegment } from "@/lib/marketing";

/**
 * Single-page wizard for creating a marketing campaign.
 *
 * Currently supports the `custom_broadcast` template — it's the only
 * one with admin-editable content (the rest are auto-triggered drips
 * with per-recipient props). Adding more templates is a 1-line change
 * (extend the template dropdown + render their fields).
 *
 * Audience estimate and template preview both refresh in the background
 * (debounced) so the admin sees live feedback while typing.
 */
export default function NewCampaignForm() {
  const router = useRouter();

  // --- Identity ---
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");

  // --- Audience ---
  const [segment, setSegment] = useState<AudienceSegment>("all_subscribed");
  const [withinDays, setWithinDays] = useState<number>(30);
  const [requireConsent, setRequireConsent] = useState<
    "" | "product" | "offers" | "pro_features"
  >("product");
  const [customEmailsText, setCustomEmailsText] = useState("");
  const [excludeCold, setExcludeCold] = useState(true);

  // --- Template & content (custom_broadcast) ---
  const templateKey = "custom_broadcast";
  const [eyebrow, setEyebrow] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [postscript, setPostscript] = useState("");

  // --- Live estimates / preview ---
  const [estimate, setEstimate] = useState<AudienceEstimate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [_estimating, startEstimate] = useTransition();
  const [_previewing, startPreview] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-derive slug from name unless the admin edits it manually.
  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(name));
  }, [name, slugTouched]);

  // Build the audience filter object that backs both estimate + create.
  const audienceFilter = useMemo<AudienceFilter>(() => {
    const base: AudienceFilter = { segment };
    if (segment === "leads_recent") base.withinDays = withinDays;
    if (requireConsent) base.requireConsent = requireConsent;
    if (segment === "custom") {
      base.emails = customEmailsText
        .split(/[\s,;]+/)
        .map((e) => e.trim())
        .filter(Boolean);
    }
    if (excludeCold) base.excludeCold = true;
    return base;
  }, [segment, withinDays, requireConsent, customEmailsText, excludeCold]);

  // Build the template-specific props object.
  const templateProps = useMemo(
    () => ({
      eyebrow: eyebrow || undefined,
      headline: headline || "Título de la campaña",
      body: body || "Cuerpo del mensaje. Separá párrafos con líneas en blanco.",
      ctaLabel: ctaLabel || undefined,
      ctaUrl: ctaUrl || undefined,
      postscript: postscript || undefined,
      preheader: preheader || undefined,
    }),
    [eyebrow, headline, body, ctaLabel, ctaUrl, postscript, preheader],
  );

  // Re-estimate audience when any audience field changes (debounced).
  useDebouncedEffect(
    () => {
      startEstimate(async () => {
        try {
          const next = await estimateAudience(audienceFilter);
          setEstimate(next);
        } catch (e) {
          console.error("estimate failed", e);
          setEstimate(null);
        }
      });
    },
    [audienceFilter],
    400,
  );

  // Re-render preview when template / content fields change.
  useDebouncedEffect(
    () => {
      startPreview(async () => {
        try {
          const html = await previewTemplate({
            templateKey,
            templateProps,
          });
          setPreviewHtml(html);
        } catch (e) {
          console.error("preview failed", e);
        }
      });
    },
    [templateKey, templateProps],
    400,
  );

  function buildPayload() {
    return {
      name: name.trim(),
      slug: slug.trim(),
      subject: subject.trim(),
      preheader: preheader.trim() || undefined,
      templateKey,
      templateProps,
      audienceFilter,
    };
  }

  function validateBeforeSubmit(): string | null {
    if (!name.trim()) return "Ingresá un nombre para la campaña.";
    if (!slug.trim()) return "El slug no puede estar vacío.";
    if (!subject.trim()) return "Ingresá un subject para el email.";
    if (!headline.trim()) return "Definí el headline del email.";
    if (!body.trim()) return "Escribí el cuerpo del email.";
    if (segment === "custom" && (audienceFilter.emails ?? []).length === 0) {
      return "Para audiencia 'custom' tenés que pegar al menos un email.";
    }
    if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
      return "Para incluir un botón CTA necesitás definir tanto el label como la URL.";
    }
    return null;
  }

  function handleSaveDraft() {
    const error = validateBeforeSubmit();
    if (error) {
      setSubmitError(error);
      return;
    }
    setSubmitError(null);
    startSubmit(async () => {
      const result = await createCampaign(buildPayload());
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.push(`/admin/marketing/${result.campaignId}`);
    });
  }

  function handleSendNow() {
    const error = validateBeforeSubmit();
    if (error) {
      setSubmitError(error);
      return;
    }
    if (!estimate || estimate.afterFrequencyCap === 0) {
      setSubmitError(
        "La audiencia final es 0 destinatarios. Cambiá el segmento o esperá a que se agote el cap de frecuencia.",
      );
      return;
    }
    if (
      !window.confirm(
        `Esto va a enviar el email a ~${estimate.afterFrequencyCap} destinatarios reales. ¿Confirmás?`,
      )
    ) {
      return;
    }

    setSubmitError(null);
    startSubmit(async () => {
      const created = await createCampaign(buildPayload());
      if (!created.ok) {
        setSubmitError(created.error);
        return;
      }
      const dispatched = await dispatchCampaignNow({
        campaignId: created.campaignId,
        applyFrequencyCap: true,
      });
      if (!dispatched.ok) {
        setSubmitError(dispatched.error);
        return;
      }
      router.push(`/admin/marketing/${created.campaignId}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* LEFT — form */}
      <div className="space-y-5">
        <Section title="1 · Identidad de la campaña">
          <Field label="Nombre interno" hint="Solo lo ves vos en el admin.">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lanzamiento Pro Q2 2026"
              className={inputClass}
            />
          </Field>
          <Field label="Slug" hint="Identificador único — minúsculas, números y guiones.">
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              placeholder="lanzamiento-pro-q2-2026"
              className={`${inputClass} font-bh-mono`}
            />
          </Field>
          <Field label="Subject" hint="Lo que se ve en la bandeja de entrada.">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Hay novedades en BallersHub"
              className={inputClass}
            />
          </Field>
          <Field
            label="Preheader (opcional)"
            hint="Texto de preview que aparece al lado del subject. Si lo dejás vacío usamos el primer párrafo."
          >
            <input
              type="text"
              value={preheader}
              onChange={(e) => setPreheader(e.target.value)}
              placeholder="Te contamos en 30 segundos"
              className={inputClass}
            />
          </Field>
        </Section>

        <Section title="2 · Audiencia">
          <Field label="Segmento">
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as AudienceSegment)}
              className={inputClass}
            >
              <option value="all_subscribed">Todos los suscriptos</option>
              <option value="registered_no_profile">Registrados sin perfil</option>
              <option value="pro_players_active">Pro players activos</option>
              <option value="leads_recent">Leads recientes (portfolio)</option>
              <option value="custom">Lista custom (pegar emails)</option>
            </select>
          </Field>

          {segment === "leads_recent" ? (
            <Field label="Ventana en días">
              <input
                type="number"
                min={1}
                max={365}
                value={withinDays}
                onChange={(e) => setWithinDays(Math.max(1, Number(e.target.value || 30)))}
                className={inputClass}
              />
            </Field>
          ) : null}

          {segment === "all_subscribed" ? (
            <Field
              label="Consentimiento requerido"
              hint="Solo se incluyen suscriptos que tildaron este consentimiento."
            >
              <select
                value={requireConsent}
                onChange={(e) => setRequireConsent(e.target.value as typeof requireConsent)}
                className={inputClass}
              >
                <option value="product">Producto / nuevos perfiles</option>
                <option value="offers">Ofertas / promos</option>
                <option value="pro_features">Features Pro</option>
                <option value="">Cualquiera</option>
              </select>
            </Field>
          ) : null}

          {segment === "custom" ? (
            <Field
              label="Emails (uno por línea o separados por coma)"
              hint="Útil para tests internos. Suppression y frequency cap igual se aplican."
            >
              <textarea
                rows={5}
                value={customEmailsText}
                onChange={(e) => setCustomEmailsText(e.target.value)}
                placeholder="alguien@ejemplo.com&#10;otro@ejemplo.com"
                className={`${inputClass} font-bh-mono text-[12px]`}
              />
            </Field>
          ) : null}

          <label className="flex items-start gap-3 rounded-bh-md border border-white/[0.06] bg-bh-surface-1 p-3">
            <input
              type="checkbox"
              checked={excludeCold}
              onChange={(e) => setExcludeCold(e.target.checked)}
              className="mt-0.5 size-4 cursor-pointer accent-bh-lime"
            />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-bh-fg-1">
                Excluir suscriptores en estado <span className="text-bh-warning">cold</span>
              </div>
              <div className="text-[11px] text-bh-fg-4 leading-[1.5]">
                Suscriptores que no abrieron 3+ emails seguidos. Recomendado dejarlo activo
                para preservar tu reputación de envío. Los <span className="text-bh-danger">dormant</span>{" "}
                (6+ skipped) se filtran siempre.
              </div>
            </div>
          </label>

          <AudienceEstimateBox estimate={estimate} loading={_estimating} />
        </Section>

        <Section title="3 · Contenido del email">
          <p className="-mt-1 text-[11px] text-bh-fg-4">
            Usás el template <strong className="text-bh-fg-2">Broadcast genérico</strong>. El
            preview de la derecha se actualiza en vivo.
          </p>

          <Field label="Eyebrow (opcional)" hint="Etiqueta lime arriba del título.">
            <input
              type="text"
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              placeholder="Anuncio"
              className={inputClass}
            />
          </Field>
          <Field label="Headline">
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Llegó la nueva feature X"
              className={inputClass}
            />
          </Field>
          <Field label="Cuerpo" hint="Separá párrafos con una línea en blanco.">
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hola {{firstName}},\n\nTe contamos que…\n\nUn segundo párrafo opcional."}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="CTA Label (opcional)">
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Probar ahora"
                className={inputClass}
              />
            </Field>
            <Field label="CTA URL (opcional)">
              <input
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://ballershub.co/dashboard"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Postscript (opcional)" hint="Pequeño párrafo después del CTA.">
            <input
              type="text"
              value={postscript}
              onChange={(e) => setPostscript(e.target.value)}
              placeholder="Cualquier duda, respondé este email."
              className={inputClass}
            />
          </Field>
        </Section>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-bh-md border border-white/[0.18] px-5 py-2.5 text-[13px] font-semibold text-bh-fg-2 hover:border-white/[0.32] hover:bg-white/[0.06] hover:text-bh-fg-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={handleSendNow}
            disabled={submitting || !estimate}
            className="inline-flex items-center justify-center gap-2 rounded-bh-md bg-bh-lime px-5 py-2.5 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar ahora
          </button>
        </div>

        {submitError ? (
          <div className="flex items-start gap-2 rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-[13px] text-bh-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        ) : null}
      </div>

      {/* RIGHT — preview */}
      <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
        <div className="rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-3">
          <header className="mb-2 flex items-center justify-between px-2 py-1">
            <h3 className="font-bh-display text-[11px] font-bold uppercase tracking-[0.1em] text-bh-fg-3">
              Preview
            </h3>
            {_previewing ? (
              <span className="flex items-center gap-1.5 text-[10px] text-bh-fg-4">
                <Loader2 className="size-3 animate-spin" /> Renderizando…
              </span>
            ) : null}
          </header>
          <iframe
            title="Email preview"
            srcDoc={previewHtml || "<p style='font-family:sans-serif;color:#888;padding:24px'>Cargando…</p>"}
            className="h-[640px] w-full rounded-bh-md border border-white/[0.06] bg-bh-bg"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Local UI primitives
// ----------------------------------------------------------------------------

const inputClass =
  "w-full rounded-bh-md border border-white/[0.08] bg-bh-surface-1 px-3 py-2 text-[14px] text-bh-fg-1 placeholder:text-bh-fg-4 outline-none transition-colors hover:border-white/[0.18] focus:border-bh-lime focus:ring-1 focus:ring-bh-lime/30";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1 p-5">
      <h3 className="font-bh-display text-sm font-bold uppercase tracking-[0.06em] text-bh-fg-1">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-bh-fg-4">{hint}</span> : null}
    </label>
  );
}

function AudienceEstimateBox({
  estimate,
  loading,
}: {
  estimate: AudienceEstimate | null;
  loading: boolean;
}) {
  if (!estimate && !loading) return null;
  return (
    <div className="rounded-bh-md border border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.04)] px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-lime">
        Estimación de audiencia
        {loading ? <Loader2 className="size-3 animate-spin" /> : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Candidatos" value={estimate?.totalCandidates ?? 0} />
        <Stat label="Tras suppression" value={estimate?.afterSuppression ?? 0} />
        <Stat
          label={`Final (cap ${estimate?.cappedDays ?? 5}d)`}
          value={estimate?.afterFrequencyCap ?? 0}
          highlight
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        className={`font-bh-display text-2xl font-bold leading-none ${
          highlight ? "text-bh-lime" : "text-bh-fg-1"
        }`}
      >
        {value.toLocaleString("es-AR")}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.1em] text-bh-fg-4">{label}</div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------------

function useDebouncedEffect(effect: () => void, deps: unknown[], delay: number) {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(effect, delay);
    return () => {
      if (ref.current) clearTimeout(ref.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
