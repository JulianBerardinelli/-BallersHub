"use client";

import { useState } from "react";
import { Button, Input, Textarea, Divider } from "@heroui/react";
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
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-500"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SECTION: Logo */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-neutral-800 bg-neutral-900/40">
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
          <h3 className="text-lg font-medium text-white">Logo institucional</h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm">
            Este será el distintivo principal de tu empresa en el perfil público.
          </p>
        </div>
      </div>

      {/* SECTION: General Info */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Información General</h3>
          <p className="text-sm text-neutral-400">Datos principales e identidad de la agencia.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Nombre de la Agencia"
            labelPlacement="outside"
            placeholder="Nombre oficial"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
            isRequired
          />

          <Input
            label="URL Pública (Slug)"
            labelPlacement="outside"
            placeholder="mi-agencia-fc"
            value={formData.slug}
            onChange={(e) => handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
            description={`Visible en: ballershub.co/agency/${formData.slug || "..."}`}
            isRequired
          />

          <Input
            label="Sede Central (Headquarters)"
            labelPlacement="outside"
            placeholder="Ej: Madrid, España"
            value={formData.headquarters}
            onChange={(e) => handleChange("headquarters", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />

          <Input
            label="Año de Fundación"
            labelPlacement="outside"
            placeholder="Ej: 2010"
            type="number"
            min={1800}
            max={new Date().getFullYear()}
            value={formData.foundationYear}
            onChange={(e) => handleChange("foundationYear", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />

          <div className="sm:col-span-2">
            <Textarea
              label="Sobre la Agencia"
              labelPlacement="outside"
              placeholder="Escribe la historia o enfoque principal de tu agencia aquí..."
              classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
              minRows={4}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>
        </div>
      </section>

      <Divider className="bg-neutral-800" />

      {/* SECTION: Operative & Licenses */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Operativa y Licencias</h3>
          <p className="text-sm text-neutral-400">Alcance de representación y certificaciones formales.</p>
        </div>

        <div className="mb-6">
          <CountryMultiPicker
            max={10}
            defaultValue={initialCountryPicks}
            onChange={(picks) => setOperativeCountries(picks.map((p) => p.code))}
          />
          <p className="text-xs text-neutral-500 mt-2">
            Selecciona hasta 10 países donde la agencia tiene operaciones o representaciones activas.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-300">Licencias de Representación</h4>
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
            <div className="text-center py-6 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-xl text-sm text-neutral-500">
              No tienes licencias registradas (ej: FIFA, RFEF, CBF).
            </div>
          ) : (
            <div className="space-y-4">
              {licenses.map((lic, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900/30 items-start sm:items-end">
                  <Input
                    label="Entidad / Tipo"
                    labelPlacement="outside"
                    placeholder="Ej: Licencia FIFA"
                    size="sm"
                    value={lic.type}
                    onChange={(e) => handleUpdateLicense(index, "type", e.target.value)}
                    classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
                    isRequired
                  />
                  <Input
                    label="Número de Licencia"
                    labelPlacement="outside"
                    placeholder="Ej: 2023000123"
                    size="sm"
                    value={lic.number}
                    onChange={(e) => handleUpdateLicense(index, "number", e.target.value)}
                    classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
                    isRequired
                  />
                  <Input
                    label="URL de Verificación (Opcional)"
                    labelPlacement="outside"
                    placeholder="https://fifa.com/agent/..."
                    size="sm"
                    type="url"
                    value={lic.url}
                    onChange={(e) => handleUpdateLicense(index, "url", e.target.value)}
                    classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
                  />
                  <Button
                    isIconOnly
                    variant="flat"
                    color="danger"
                    size="sm"
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

      <Divider className="bg-neutral-800" />

      {/* SECTION: Contact & Social */}
      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Contacto y Redes Sociales</h3>
          <p className="text-sm text-neutral-400">Vías de comunicación directas e institucionales.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="Email Institucional"
            labelPlacement="outside"
            placeholder="agencia@ejemplo.com"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />

          <Input
            label="Teléfono Comercial"
            labelPlacement="outside"
            placeholder="+54 9 11 1234 5678"
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => handleChange("contactPhone", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />

          <Input
            label="Sitio Web (Opcional)"
            labelPlacement="outside"
            placeholder="https://tu-agencia.com"
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => handleChange("websiteUrl", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />
          
          <Input
            label="Enlace Verificado (Transfermarkt, etc)"
            labelPlacement="outside"
            placeholder="https://transfermarkt..."
            type="url"
            value={formData.verifiedLink}
            onChange={(e) => handleChange("verifiedLink", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />

          <Input
            label="Instagram"
            labelPlacement="outside"
            placeholder="https://instagram.com/tuagencia"
            type="url"
            value={formData.instagramUrl}
            onChange={(e) => handleChange("instagramUrl", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />

          <Input
            label="LinkedIn"
            labelPlacement="outside"
            placeholder="https://linkedin.com/company/tuagencia"
            type="url"
            value={formData.linkedinUrl}
            onChange={(e) => handleChange("linkedinUrl", e.target.value)}
            classNames={{ inputWrapper: "bg-neutral-950 border-neutral-800" }}
          />
        </div>
      </section>

      <div className="flex justify-end pt-4 border-t border-neutral-800">
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
