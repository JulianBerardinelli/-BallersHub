"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitManagerApplication } from "@/app/actions/manager-applications";
import KycUploader from "../../KycUploader";
import { supabase } from "@/lib/supabase/client";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      router.push("/onboarding/start"); // It will redirect to dashboard or show "in review" thanks to logic there
    } catch (err: any) {
      setError(err.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Registro de Manager / Agencia</h1>
      <p className="text-neutral-400">Paso {step} de 3</p>

      {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-md text-sm">{error}</div>}

      <div className="space-y-4">
        {step === 1 && (
          <div className="grid gap-4 animate-in fade-in">
            <div>
              <label className="block text-sm mb-1">Tu Nombre Completo *</label>
              <input name="fullName" value={formData.fullName} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Email de Contacto *</label>
              <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Nombre de la Agencia *</label>
              <input name="agencyName" value={formData.agencyName} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm mb-1">Sitio Web de la Agencia</label>
              <input type="url" name="agencyWebsiteUrl" value={formData.agencyWebsiteUrl} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Enlace de Validación (Transfermarkt, IG, etc.) *</label>
              <input type="url" name="verifiedLink" value={formData.verifiedLink} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" required placeholder="https://transfermarkt.com/..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 animate-in fade-in">
            <h3 className="font-medium">Certificación Oficial</h3>
            <p className="text-sm text-neutral-400 mb-2">Sube o enlaza tu licencia FIFA, FIGC, RFEF u otra asociación.</p>
            
            <div>
              <label className="block text-sm mb-1">Tipo de Licencia</label>
              <select name="agentLicenseType" value={formData.agentLicenseType} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2">
                <option value="">Ninguna / Otra</option>
                <option value="FIFA">FIFA</option>
                <option value="RFEF">RFEF (España)</option>
                <option value="FIGC">FIGC (Italia)</option>
                <option value="AFA">AFA (Argentina)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Documento de Licencia (PDF o Imagen)</label>
              <input type="file" accept="image/*,application/pdf" onChange={uploadLicense} className="w-full text-sm" />
              {formData.agentLicenseUrl && <p className="text-green-500 text-xs mt-1">✓ Licencia cargada</p>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 animate-in fade-in">
            <h3 className="font-medium">Verificación de Identidad (KYC)</h3>
            <p className="text-sm text-neutral-400 mb-2">Para proteger la integridad de la plataforma, necesitamos verificar tu identidad.</p>
            
            <KycUploader 
              onUploaded={({ idDocKey, selfieKey }) => {
                if (idDocKey) setFormData(p => ({ ...p, idDocUrl: idDocKey }));
                if (selfieKey) setFormData(p => ({ ...p, selfieUrl: selfieKey }));
              }} 
            />
            <div className="flex gap-4 mt-2">
              <div className="text-xs">{formData.idDocUrl ? '✅ DNI listo' : '❌ Falta DNI'}</div>
              <div className="text-xs">{formData.selfieUrl ? '✅ Selfie lista' : '❌ Falta Selfie'}</div>
            </div>
            
            <div>
              <label className="block text-sm mb-1 mt-4">Notas Adicionales (Opcional)</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2" rows={3}></textarea>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-neutral-800">
        {step > 1 ? (
          <button onClick={handlePrev} className="px-4 py-2 border border-neutral-800 rounded-md text-sm hover:bg-neutral-900">
            Atrás
          </button>
        ) : <div />}

        {step < 3 ? (
          <button 
            onClick={handleNext} 
            disabled={step === 1 && (!formData.fullName || !formData.contactEmail || !formData.agencyName || !formData.verifiedLink)}
            className="px-4 py-2 bg-primary text-white font-semibold rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            Siguiente
          </button>
        ) : (
          <button 
            onClick={onSubmit} 
            disabled={loading || !formData.idDocUrl || !formData.selfieUrl}
            className="px-4 py-2 bg-primary text-white font-semibold rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </button>
        )}
      </div>
    </main>
  );
}
