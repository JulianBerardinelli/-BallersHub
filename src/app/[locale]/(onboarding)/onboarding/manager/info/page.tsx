"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { submitManagerApplication } from "@/app/actions/manager-applications";
import KycUploader from "../../KycUploader";
import { supabase } from "@/lib/supabase/client";

const INPUT_CLS =
  "w-full rounded-bh-md border border-white/[0.08] bg-bh-surface-1 px-3 py-2 text-[13px] text-bh-fg-1 placeholder:text-bh-fg-4 transition-colors duration-150 hover:border-white/[0.18] focus:border-bh-lime focus:outline-none focus:ring-1 focus:ring-bh-lime/40";

const LABEL_CLS = "mb-1.5 block text-xs font-medium text-bh-fg-2";

export default function ManagerOnboardingPage() {
  const t = useTranslations("onboarding");
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
      if (!user) throw new Error(t("manager.errorNoUser"));

      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const key = `${user.id}/license-${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage.from("kyc").upload(key, file, { upsert: true });
      if (error) throw error;

      setFormData(prev => ({ ...prev, agentLicenseUrl: data.path }));
    } catch (err: any) {
      setError(err.message || t("manager.errorUploadLicense"));
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitManagerApplication(formData);
      router.push("/onboarding/start");
    } catch (err: any) {
      setError(err.message || t("manager.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 p-8">
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-bh-pill border border-bh-fg-4 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-fg-3">
          {t("manager.badge", { step })}
        </span>
        <h1 className="font-bh-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.005em] text-bh-fg-1 md:text-4xl">
          {t("manager.title")} <span className="text-bh-blue">{t("manager.titleHighlight")}</span>
        </h1>
        <p className="text-sm leading-[1.6] text-bh-fg-3">
          {t("manager.subtitle")}
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
              <label className={LABEL_CLS}>{t("manager.step1.fullName")}</label>
              <input name="fullName" value={formData.fullName} onChange={handleChange} className={INPUT_CLS} required />
            </div>
            <div>
              <label className={LABEL_CLS}>{t("manager.step1.contactEmail")}</label>
              <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className={INPUT_CLS} required />
            </div>
            <div>
              <label className={LABEL_CLS}>{t("manager.step1.phone")}</label>
              <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>{t("manager.step1.agencyName")}</label>
              <input name="agencyName" value={formData.agencyName} onChange={handleChange} className={INPUT_CLS} required />
            </div>
            <div>
              <label className={LABEL_CLS}>{t("manager.step1.agencyWebsite")}</label>
              <input type="url" name="agencyWebsiteUrl" value={formData.agencyWebsiteUrl} onChange={handleChange} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>{t("manager.step1.verifiedLink")}</label>
              <input type="url" name="verifiedLink" value={formData.verifiedLink} onChange={handleChange} className={INPUT_CLS} required placeholder="https://transfermarkt.com/..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                {t("manager.step2.title")}
              </h3>
              <p className="text-sm text-bh-fg-3">
                {t("manager.step2.subtitle")}
              </p>
            </div>

            <div>
              <label className={LABEL_CLS}>{t("manager.step2.licenseType")}</label>
              <select name="agentLicenseType" value={formData.agentLicenseType} onChange={handleChange} className={INPUT_CLS}>
                <option value="">{t("manager.step2.licenseTypeNone")}</option>
                <option value="FIFA">FIFA</option>
                <option value="RFEF">{t("manager.step2.licenseTypeRfef")}</option>
                <option value="FIGC">{t("manager.step2.licenseTypeFigc")}</option>
                <option value="AFA">{t("manager.step2.licenseTypeAfa")}</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>{t("manager.step2.licenseDoc")}</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={uploadLicense}
                className="w-full text-sm text-bh-fg-3 file:mr-3 file:rounded-bh-md file:border file:border-white/[0.08] file:bg-white/[0.04] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-bh-fg-2 hover:file:bg-white/[0.08]"
              />
              {formData.agentLicenseUrl && (
                <p className="mt-1 text-xs text-bh-success">{t("manager.step2.licenseLoaded")}</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 animate-in fade-in">
            <div className="space-y-1">
              <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                {t("manager.step3.title")}
              </h3>
              <p className="text-sm text-bh-fg-3">
                {t("manager.step3.subtitle")}
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
                {formData.idDocUrl ? t("manager.step3.idReady") : t("manager.step3.idMissing")}
              </span>
              <span className={formData.selfieUrl ? "text-bh-success" : "text-bh-fg-4"}>
                {formData.selfieUrl ? t("manager.step3.selfieReady") : t("manager.step3.selfieMissing")}
              </span>
            </div>

            <div>
              <label className={`${LABEL_CLS} mt-2`}>{t("manager.step3.notes")}</label>
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
            {t("manager.back")}
          </button>
        ) : <div />}

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={step === 1 && (!formData.fullName || !formData.contactEmail || !formData.agencyName || !formData.verifiedLink)}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {t("manager.next")}
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={loading || !formData.idDocUrl || !formData.selfieUrl}
            className="rounded-bh-md bg-bh-lime px-5 py-2 text-[13px] font-semibold text-bh-black shadow-[0_2px_12px_rgba(204,255,0,0.35)] transition-all duration-150 ease-[cubic-bezier(0.25,0,0,1)] hover:-translate-y-px hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {loading ? t("manager.submitting") : t("manager.submit")}
          </button>
        )}
      </div>
    </main>
  );
}
