"use client";

// Editor de contacto del coach: email, teléfono, WhatsApp, idiomas, documento,
// toggle de "mostrar sección de contacto en la página pública". Espeja el
// ContactInformationSection de players pero con la firma de
// updateCoachContactInformation. El admin NO toca el email (auth.users es del
// owner) — en liveMode el campo email se muestra deshabilitado.

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { Pencil, X, Eye, EyeOff } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { BhCheckbox } from "@/components/ui/BhCheckbox";

import {
  updateCoachContactInformation,
  type CoachContactInfoResponse,
} from "@/app/actions/coach-personal-data";

type FormValues = {
  email: string;
  phone: string;
  languages: string;
  documents: string;
  documentCountry: string;
  whatsapp: string;
  showContactSection: boolean;
};

type StatusState = { type: "success" | "error"; message: string } | null;

export type CoachContactInfoAction = (input: {
  coachId: string;
  email?: string;
  phone?: string;
  languages?: string;
  documents?: string;
  documentCountry?: string;
  whatsapp?: string;
  showContactSection?: boolean;
}) => Promise<
  | { success: true; data: CoachContactInfoResponse; message?: string; updatedFields: string[] }
  | { success: false; message: string; fieldErrors?: Record<string, string | undefined> }
>;

type Props = {
  coachId: string;
  initialValues: FormValues;
  action?: CoachContactInfoAction;
  /** Cuando true: oculta el campo email (no editable desde admin). */
  hideEmail?: boolean;
};

export default function CoachContactInformationSection({
  coachId,
  initialValues,
  action = (input) => updateCoachContactInformation({ coachId: input.coachId, ...input }),
  hideEmail = false,
}: Props) {
  const [defaults, setDefaults] = useState<FormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: initialValues });

  useEffect(() => {
    setDefaults(initialValues);
    reset(initialValues);
  }, [initialValues, reset]);

  function handleToggleEditing() {
    if (isEditing) {
      reset(defaults);
      clearErrors();
      setStatus(null);
      setIsEditing(false);
      return;
    }
    clearErrors();
    setStatus(null);
    setIsEditing(true);
  }

  function handleCancel() {
    reset(defaults);
    clearErrors();
    setStatus(null);
    setIsEditing(false);
  }

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      setStatus(null);
      clearErrors();
      const result = await action({ coachId, ...values });
      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof FormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }
      // El admin no toca el email; conservamos el valor del form para no
      // hacerlo desaparecer al refrescar defaults.
      const dataWithEmail = { ...result.data, email: hideEmail ? defaults.email : (result.data.email || values.email) };
      setDefaults(dataWithEmail);
      reset(dataWithEmail);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? "Datos de contacto actualizados." });
    });
  });

  return (
    <SectionCard
      title="Contacto"
      description="Datos para que clubes y agencias te contacten desde tu página pública (cuando activás la sección)."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar"}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          {!hideEmail ? (
            <FormField
              key={`email-${defaults.email}`}
              id="email"
              label="Email principal"
              description="Se actualiza también en tu cuenta. Te llegará un mail de verificación."
              readOnly={!isEditing}
              defaultValue={defaults.email}
              errorMessage={errors.email?.message}
              {...register("email")}
            />
          ) : null}
          <FormField
            key={`phone-${defaults.phone}`}
            id="phone"
            label="Teléfono"
            placeholder="+54 9 11 5555 5555"
            description="Visible sólo si activás la sección de contacto."
            readOnly={!isEditing}
            defaultValue={defaults.phone}
            errorMessage={errors.phone?.message}
            {...register("phone")}
          />
          <FormField
            key={`whatsapp-${defaults.whatsapp}`}
            id="whatsapp"
            label="WhatsApp"
            placeholder="+54 9 11 5555 5555"
            description="El módulo Pro de contacto genera el botón de WhatsApp con este número."
            readOnly={!isEditing}
            defaultValue={defaults.whatsapp}
            errorMessage={errors.whatsapp?.message}
            {...register("whatsapp")}
          />
          <FormField
            key={`languages-${defaults.languages}`}
            id="languages"
            label="Idiomas"
            placeholder="Español, Inglés, Italiano"
            description="Separá con comas. Se muestran en la ficha pública."
            readOnly={!isEditing}
            defaultValue={defaults.languages}
            errorMessage={errors.languages?.message}
            {...register("languages")}
          />
          <FormField
            key={`documents-${defaults.documents}`}
            id="documents"
            label="Documento"
            placeholder='Ej "DNI · 12.345.678"'
            description="Privado — sólo lo ve el equipo de moderación al verificar tu identidad."
            readOnly={!isEditing}
            defaultValue={defaults.documents}
            errorMessage={errors.documents?.message}
            {...register("documents")}
          />
          <FormField
            key={`documentCountry-${defaults.documentCountry}`}
            id="document_country"
            label="País del documento"
            placeholder="Argentina"
            readOnly={!isEditing}
            defaultValue={defaults.documentCountry}
            errorMessage={errors.documentCountry?.message}
            {...register("documentCountry")}
          />
        </div>

        <Controller
          control={control}
          name="showContactSection"
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 rounded-bh-md border border-white/[0.08] bg-bh-surface-1 p-4">
              <div className="flex-1">
                <BhCheckbox
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!isEditing}
                >
                  <span className="text-bh-fg-1 font-medium">
                    Mostrar sección de contacto en la página pública
                  </span>
                </BhCheckbox>
                <p className="mt-1.5 ml-6 text-[11px] leading-[1.55] text-bh-fg-4">
                  Si está apagado, los clubes sólo te pueden escribir por el formulario público (lead-gated). Encendido suma WhatsApp + datos directos.
                </p>
              </div>
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
                  field.value
                    ? "bg-bh-lime/15 text-bh-lime"
                    : "bg-white/[0.05] text-bh-fg-3",
                ].join(" ")}
              >
                {field.value ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                {field.value ? "Visible" : "Oculto"}
              </span>
            </div>
          )}
        />

        <div>
          {status ? (
            <Chip
              color={status.type === "success" ? "success" : "danger"}
              variant="flat"
              className="text-sm"
            >
              {status.message}
            </Chip>
          ) : null}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-3 border-t border-neutral-900 pt-4 sm:flex-row sm:justify-end">
            <Button variant="light" onPress={handleCancel} isDisabled={isPending}>
              Cancelar
            </Button>
            <Button
              color="primary"
              type="submit"
              isDisabled={isPending || !isDirty}
              isLoading={isPending}
            >
              Guardar cambios
            </Button>
          </div>
        ) : null}
      </form>
    </SectionCard>
  );
}
