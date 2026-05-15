"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Chip } from "@heroui/react";
import { useForm, Controller } from "react-hook-form";
import { Pencil, X, Eye, EyeOff } from "lucide-react";

import FormField from "@/components/dashboard/client/FormField";
import SectionCard from "@/components/dashboard/client/SectionCard";
import { BhCheckbox } from "@/components/ui/BhCheckbox";
import { profileNotification, useNotificationContext } from "@/modules/notifications";

import { updateContactInformation } from "../actions";

type ContactFormValues = {
  email: string;
  phone: string;
  languages: string;
  documents: string;
  documentCountry: string;
  whatsapp: string;
  showContactSection: boolean;
};

type StatusState = { type: "success" | "error"; message: string } | null;

type Props = {
  playerId: string;
  initialValues: ContactFormValues;
};

export default function ContactInformationSection({ playerId, initialValues }: Props) {
  const [defaults, setDefaults] = useState<ContactFormValues>(initialValues);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, startTransition] = useTransition();
  const { enqueue } = useNotificationContext();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    control,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues>({
    defaultValues: initialValues,
  });

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

      const result = await updateContactInformation({
        playerId,
        ...values,
      });

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            if (!message) return;
            setError(field as keyof ContactFormValues, { type: "server", message });
          });
        }
        setStatus({ type: "error", message: result.message });
        return;
      }

      setDefaults(result.data);
      reset(result.data);
      setIsEditing(false);
      setStatus({ type: "success", message: result.message ?? "Datos de contacto actualizados correctamente." });

      if (result.updatedFields.length > 0) {
        enqueue(
          profileNotification.updated({
            sectionLabel: "tus datos de contacto",
            changedFields: result.updatedFields,
            detailsHref: "/dashboard/edit-profile/personal-data",
          }),
        );
      }
    });
  });

  return (
    <SectionCard
      title="Datos de contacto"
      description="Esta información se utilizará para comunicaciones privadas. Podés permitir que tu email y WhatsApp se muestren en tu portfolio público."
      actions={
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={isEditing ? "Cancelar edición" : "Editar datos de contacto"}
          onPress={handleToggleEditing}
          isDisabled={isPending}
        >
          {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </Button>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            key={`email-${defaults.email}`}
            id="email"
            label="Email principal"
            description="Es el email asociado a tu cuenta. Se usa también como contacto público si activás la visibilidad."
            readOnly={!isEditing}
            defaultValue={defaults.email}
            errorMessage={errors.email?.message}
            {...register("email")}
          />
          <FormField
            key={`phone-${defaults.phone}`}
            id="phone"
            label="Teléfono de contacto"
            placeholder="+54 9 11 1234 5678"
            description="Uso interno (no se muestra en tu portfolio)."
            readOnly={!isEditing}
            defaultValue={defaults.phone}
            errorMessage={errors.phone?.message}
            {...register("phone")}
          />
          <FormField
            key={`whatsapp-${defaults.whatsapp}`}
            id="whatsapp"
            label="WhatsApp"
            placeholder="+54 9 11 1234 5678"
            description="Número en formato internacional. Si activás la visibilidad pública, aparece como canal de contacto en tu portfolio."
            readOnly={!isEditing}
            defaultValue={defaults.whatsapp}
            errorMessage={errors.whatsapp?.message}
            {...register("whatsapp")}
          />
          <FormField
            key={`languages-${defaults.languages}`}
            id="languages"
            label="Idiomas"
            placeholder="Ej: Español, Inglés"
            description="Definí los idiomas en los que te pueden contactar."
            readOnly={!isEditing}
            defaultValue={defaults.languages}
            errorMessage={errors.languages?.message}
            {...register("languages")}
          />
          <FormField
            key={`documents-${defaults.documents}`}
            id="documents"
            label="Documentación"
            placeholder="Pasaporte UE, DNI, etc."
            description="Se integrará con verificación documental más adelante."
            readOnly={!isEditing}
            defaultValue={defaults.documents}
            errorMessage={errors.documents?.message}
            {...register("documents")}
          />
          <FormField
            key={`documentCountry-${defaults.documentCountry}`}
            id="document_country"
            label="País del documento"
            placeholder="País emisor"
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
                    Permitir mostrar mis datos de contacto en mi portfolio
                  </span>
                </BhCheckbox>
                <p className="mt-1.5 ml-6 text-[11px] leading-[1.55] text-bh-fg-4">
                  Cuando está activado, tu email principal y tu WhatsApp aparecen como canales de contacto en tu portfolio público.
                  Próximamente esta visibilidad requerirá un plan Pro.
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
