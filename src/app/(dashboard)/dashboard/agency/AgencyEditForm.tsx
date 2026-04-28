"use client";

import { useState } from "react";
import { Button, Divider } from "@heroui/react";
import FormField from "@/components/dashboard/client/FormField";
import { Plus, Trash2 } from "lucide-react";
import { updateAgencyProfile } from "@/app/actions/agencies";
import AgencyLogoUploader from "@/components/dashboard/manager/AgencyLogoUploader";
import CountryMultiPicker, { type CountryPick } from "@/components/common/CountryMultiPicker";

type License = {
  type: string;
  number: string;
  url?: string;
};

type Props = {
  agency: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    websiteUrl: string | null;
    verifiedLink: string | null;
    agentLicenseType: string | null;
    agentLicenseUrl: string | null;
    licenses: License[] | null;
    operativeCountries: string[] | null;
    headquarters: string | null;
    foundationYear: number | null;
    instagramUrl: string | null;
    twitterUrl: string | null;
    linkedinUrl: string | null;
    services: string[] | null;
  };
};

export default function AgencyEditForm({ agency }: Props) {
  const [formData, setFormData] = useState({
    name: agency.name || "",
    slug: agency.slug || "",
    description: agency.description || "",
    contactEmail: agency.contactEmail || "",
    contactPhone: agency.contactPhone || "",
    websiteUrl: agency.websiteUrl || "",
    verifiedLink: agency.verifiedLink || "",
    headquarters: agency.headquarters || "",
    foundationYear: agency.foundationYear ? agency.foundationYear.toString() : "",
    instagramUrl: agency.instagramUrl || "",
    twitterUrl: agency.twitterUrl || "",
    linkedinUrl: agency.linkedinUrl || "",
  });

  const [licenses, setLicenses] = useState<License[]>(agency.licenses || []);
  const [operativeCountries, setOperativeCountries] = useState<string[]>(agency.operativeCountries || []);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLicense = () => {
    if (licenses.length >= 10) return;
    setLicenses([...licenses, { type: "", number: "", url: "" }]);
  };

  const handleUpdateLicense = (index: number, field: keyof License, value: string) => {
    const updated = [...licenses];
    updated[index] = { ...updated[index], [field]: value };
    setLicenses(updated);
  };

  const handleRemoveLicense = (index: number) => {
    setLicenses(licenses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = {
        ...formData,
        foundationYear: formData.foundationYear ? parseInt(formData.foundationYear, 10) : null,
        licenses: licenses.filter((l) => l.type.trim() && l.number.trim()),
        operativeCountries,
      };

      await updateAgencyProfile(agency.id, payload);
      setMessage({ type: "success", text: "Agencia actualizada correctamente." });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al actualizar la agencia.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
        setLoading(false);
    }
  };

  const dnEs = new Intl.DisplayNames(["es"], { type: "region", fallback: "code" });
  const initialCountryPicks: CountryPick[] = operativeCountries.map((code) => ({
    code,
    name: dnEs.of(code) ?? code,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {message.text && (
        <div
          className={`rounded-bh-md border p-3 text-sm ${
            message.type === "success"
              ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-bh-success"
              : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-bh-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SECTION: Logo */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1">
        <AgencyLogoUploader
          agencyId={agency.id}
          currentLogoUrl={agency.logoUrl}
          onUploadSuccess={async (url) => {
            try {
              await updateAgencyProfile(agency.id, { logoUrl: url });
              setMessage({ type: "success", text: "Logo actualizado exitosamente." });
            } catch {
              setMessage({ type: "error", text: "No se pudo vincular el logo." });
            }
          }}
        />
        <div className="text-center sm:text-left">
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Logo institucional</h3>
          <p className="text-sm text-bh-fg-3 mt-1 max-w-sm">
            Este será el distintivo principal de tu empresa en el perfil público.
          </p>
        </div>
      </div>

      {/* SECTION: General Info */}
      <section className="space-y-6">
        <div>
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Información General</h3>
          <p className="text-sm text-bh-fg-3">Datos principales e identidad de la agencia.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Nombre de la Agencia"
           
            placeholder="Nombre oficial"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
           
            isRequired
          />

          <FormField
            label="URL Pública (Slug)"
           
            placeholder="mi-agencia-fc"
            value={formData.slug}
            onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
           
            description={`Visible en: ballershub.co/agency/${formData.slug || "..."}`}
            isRequired
          />

          <FormField
            label="Sede Central (Headquarters)"
           
            placeholder="Ej: Madrid, España"
            value={formData.headquarters}
            onChange={(e) => handleChange("headquarters", e.target.value)}
           
          />

          <FormField
            label="Año de Fundación"
           
            placeholder="Ej: 2010"
            type="number"
            min={1800}
            max={new Date().getFullYear()}
            value={formData.foundationYear}
            onChange={(e) => handleChange("foundationYear", e.target.value)}
           
          />

          <div className="sm:col-span-2">
            <FormField as="textarea"
              label="Sobre la Agencia"
             
              placeholder="Escribe la historia o enfoque principal de tu agencia aquí..."
             
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>
      </section>

      <Divider className="bg-white/[0.08]" />

      {/* SECTION: Operative & Licenses */}
      <section className="space-y-6">
        <div>
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Operativa y Licencias</h3>
          <p className="text-sm text-bh-fg-3">Alcance de representación y certificaciones formales.</p>
        </div>

        <div className="mb-6">
          <CountryMultiPicker
            max={10}
            defaultValue={initialCountryPicks}
            onChange={(picks) => setOperativeCountries(picks.map((p) => p.code))}
          />
          <p className="text-[11px] text-bh-fg-4 mt-2">
            Selecciona hasta 10 países donde la agencia tiene operaciones o representaciones activas.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-fg-2">Licencias de Representación</h4>
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<Plus className="h-4 w-4" />}
              onPress={handleAddLicense}
              isDisabled={licenses.length >= 10}
            >
              Agregar Licencia
            </Button>
          </div>

          {licenses.length === 0 ? (
            <div className="text-center py-6 bg-bh-surface-1/40 border border-dashed border-white/[0.08] rounded-xl text-sm text-bh-fg-4">
              No tienes licencias registradas (ej: FIFA, RFEF, CBF).
            </div>
          ) : (
            <div className="space-y-4">
              {licenses.map((lic, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 rounded-bh-lg border border-white/[0.08] bg-bh-surface-1/60 items-start sm:items-end">
                  <FormField
                    label="Entidad / Tipo"
                   
                    placeholder="Ej: Licencia FIFA"

                    value={lic.type}
                    onChange={(e) => handleUpdateLicense(index, "type", e.target.value)}
                   
                    isRequired
                  />
                  <FormField
                    label="Número de Licencia"
                   
                    placeholder="Ej: 2023000123"

                    value={lic.number}
                    onChange={(e) => handleUpdateLicense(index, "number", e.target.value)}
                   
                    isRequired
                  />
                  <FormField
                    label="URL de Verificación (Opcional)"
                   
                    placeholder="https://fifa.com/agent/..."

                    type="url"
                    value={lic.url}
                    onChange={(e) => handleUpdateLicense(index, "url", e.target.value)}
                   
                  />
                  <Button
                    isIconOnly
                    variant="flat"
                    color="danger"

                    className="mb-1"
                    onPress={() => handleRemoveLicense(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Divider className="bg-white/[0.08]" />

      {/* SECTION: Contact & Social */}
      <section className="space-y-6">
        <div>
          <h3 className="font-bh-display text-lg font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Contacto y Redes Sociales</h3>
          <p className="text-sm text-bh-fg-3">Vías de comunicación directas e institucionales.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            label="Email Institucional"
           
            placeholder="agencia@ejemplo.com"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
           
          />

          <FormField
            label="Teléfono Comercial"
           
            placeholder="+54 9 11 1234 5678"
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => handleChange("contactPhone", e.target.value)}
           
          />

          <FormField
            label="Sitio Web (Opcional)"
           
            placeholder="https://tu-agencia.com"
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => handleChange("websiteUrl", e.target.value)}
           
          />
          
          <FormField
            label="Enlace Verificado (Transfermarkt, etc)"
           
            placeholder="https://transfermarkt..."
            type="url"
            value={formData.verifiedLink}
            onChange={(e) => handleChange("verifiedLink", e.target.value)}
           
          />

          <FormField
            label="Instagram"
           
            placeholder="https://instagram.com/tuagencia"
            type="url"
            value={formData.instagramUrl}
            onChange={(e) => handleChange("instagramUrl", e.target.value)}
           
          />

          <FormField
            label="LinkedIn"
           
            placeholder="https://linkedin.com/company/tuagencia"
            type="url"
            value={formData.linkedinUrl}
            onChange={(e) => handleChange("linkedinUrl", e.target.value)}
           
          />
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t border-white/[0.08]">
        <Button 
          type="submit" 
          color="primary" 
          isLoading={loading}
          className="font-medium px-8"
        >
          Guardar Configuración
        </Button>
      </div>
    </form>
  );
}
