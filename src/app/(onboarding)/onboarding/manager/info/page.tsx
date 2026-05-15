"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitManagerApplication } from "@/app/actions/manager-applications";
import KycUploader from "../../KycUploader";
import { supabase } from "@/lib/supabase/client";

const INPUT_CLS =
  "w-full rounded-bh-md border border-white/[0.08] bg-bh-surface-1 px-3 py-2 text-[13px] text-bh-fg-1 placeholder:text-bh-fg-4 transition-colors duration-150 hover:border-white/[0.18] focus:border-bh-lime focus:outline-none focus:ring-1 focus:ring-bh-lime/40";

const LABEL_CLS = "mb-1.5 block text-xs font-medium text-bh-fg-2";

export default function ManagerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    contactEmail: "",
    contactPhone: "",
    agencyName: "",
    agencyWebsiteUrl: "",
    verifiedLink: "",
    agentLicenseType: "",
    agentLicenseUrl: "",
    idDocUrl: "",
    selfieUrl: "",
    notes: "",
  });

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const uploadLicense = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario en sesión");

      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const key = `${user.id}/license-${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage.from("kyc").upload(key, file, { upsert: true });
      if (error) throw error;

      setFormData(prev => ({ ...prev, agentLicenseUrl: data.path }));
    } catch (err: any) {
      setError(err.message || "Error al subir la licencia");
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitManagerApplication(formData);
      router.push("/onboarding/start");
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          Manager · Paso {step} de 3
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          Registro de <span className="text-bh-blue">manager</span>
        </h1>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          Validamos tu identidad y representación para mantener la integridad
          de la plataforma.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-bh-pill transition-colors duration-300 ${
              n <= step ? "bg-bh-lime" : "bg-white/[0.08]"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-bh-danger">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {step === 1 && (
          <div className="grid gap-4 animate-in fade-in">
            <div>
              <label className={LABEL_CLS}>Tu nombre completo *</label>
              <input name="fullName" value={formData.fullName} onChange={handleChange} className={INPUT_CLS} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Email de contacto *</label>
              <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className={INPUT_CLS} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Teléfono</label>
              <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Nombre de la agencia *</label>
              <input name="agencyName" value={formData.agencyName} onChange={handleChange} className={INPUT_CLS} required />
            </div>
            <div>
              <label className={LABEL_CLS}>Sitio web de la agencia</label>
              <input type="url" name="agencyWebsiteUrl" value={formData.agencyWebsiteUrl} onChange={handleChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Enlace de validación (Transfermarkt, IG, etc.) *</label>
              <input type="url" name="verifiedLink" value={formData.verifiedLink} onChange={handleChange} className={INPUT_CLS} required placeholder="https://transfermarkt.com/..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                Certificación oficial
              </h3>
              <p className="text-sm text-bh-fg-3">
                Subí o enlazá tu licencia FIFA, FIGC, RFEF u otra asociación.
              </p>
            </div>

            <div>
              <label className={LABEL_CLS}>Tipo de licencia</label>
              <select name="agentLicenseType" value={formData.agentLicenseType} onChange={handleChange} className={INPUT_CLS}>
                <option value="">Ninguna / Otra</option>
                <option value="FIFA">FIFA</option>
                <option value="RFEF">RFEF (España)</option>
                <option value="FIGC">FIGC (Italia)</option>
                <option value="AFA">AFA (Argentina)</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>Documento de licencia (PDF o imagen)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={uploadLicense}
                className="w-full text-sm text-bh-fg-3 file:mr-3 file:rounded-bh-md file:border file:border-white/[0.08] file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-bh-fg-2 hover:file:bg-white/[0.08]"
              />
              {formData.agentLicenseUrl && (
                <p className="mt-1 text-xs text-bh-success">✓ Licencia cargada</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                Verificación de identidad (KYC)
              </h3>
              <p className="text-sm text-bh-fg-3">
                Para proteger la integridad de la plataforma, necesitamos
                verificar tu identidad.
              </p>
            </div>

            <KycUploader
              onUploaded={({ idDocKey, selfieKey }) => {
                if (idDocKey) setFormData(p => ({ ...p, idDocUrl: idDocKey }));
                if (selfieKey) setFormData(p => ({ ...p, selfieUrl: selfieKey }));
              }}
            />
            <div className="flex gap-4 text-xs">
              <span className={formData.idDocUrl ? "text-bh-success" : "text-bh-fg-4"}>
                {formData.idDocUrl ? "✓ DNI listo" : "○ Falta DNI"}
              </span>
              <span className={formData.selfieUrl ? "text-bh-success" : "text-bh-fg-4"}>
                {formData.selfieUrl ? "✓ Selfie lista" : "○ Falta selfie"}
              </span>
            </div>

            <div>
              <label className={`${LABEL_CLS} mt-2`}>Notas adicionales (opcional)</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className={INPUT_CLS} rows={3} />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t border-white/[0.06] pt-6">
        {step > 1 ? (
          <button
            onClick={handlePrev}
            className="rounded-bh-md border border-bh-fg-4 px-4 py-2 text-[13px] font-medium text-bh-fg-2 transition-colors duration-150 hover:border-bh-fg-3 hover:bg-white/[0.06] hover:text-bh-fg-1"
          >
            Atrás
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={step === 1 && (!formData.fullName || !formData.contactEmail || !formData.agencyName || !formData.verifiedLink)}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={loading || !formData.idDocUrl || !formData.selfieUrl}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {loading ? "Enviando..." : "Enviar solicitud"}
          </button>
        )}
      </div>
    </main>
  );
}
