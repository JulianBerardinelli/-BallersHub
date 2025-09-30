"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  User as HeroUser,
  Avatar,
} from "@heroui/react";
import Link from "next/link";
import { useTransition } from "react";
import {
  hasActiveApplication,
  isApplicationDraft,
  normalizeApplicationStatus,
} from "@/lib/dashboard/client/application-status";

export default function UserMenuHero({
  displayName,
  email,
  handle,
  avatarUrl,
  hasPlayerProfile,   // ahora significa: “público & aprobado”
  playerSlug,
  applicationStatus,
  onSignOut,
}: {
  displayName: string;
  email: string;
  handle?: string | null;
  avatarUrl?: string | null;
  hasPlayerProfile: boolean;
  playerSlug?: string | null;
  applicationStatus?: string | null;
  onSignOut: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const normalizedApplicationStatus = normalizeApplicationStatus(applicationStatus ?? null);
  const activeApplication = hasActiveApplication(normalizedApplicationStatus);
  const draftApplication = isApplicationDraft(normalizedApplicationStatus);

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button aria-label="Abrir menú de usuario">
          <HeroUser
            as="div"
            name={displayName}
            description={handle ?? email}
            className="cursor-pointer"
            avatarProps={{
              isBordered: true,
              src: avatarUrl ?? undefined,
              fallback: <Avatar name={displayName} />,
            }}
          />
        </button>
      </DropdownTrigger>

      <DropdownMenu aria-label="Acciones de usuario" variant="flat">
        <DropdownItem key="signed-in" className="h-14 gap-2" isReadOnly>
          <p className="font-semibold">Sesión iniciada como</p>
          <p className="font-semibold truncate">{email}</p>
        </DropdownItem>

        {hasPlayerProfile && playerSlug ? (
          <DropdownItem key="public-profile" as={Link} href={`/${playerSlug}`}>
            Ver perfil público
          </DropdownItem>
        ) : activeApplication ? (
          <DropdownItem key="application-status" as={Link} href="/onboarding/player/apply" color="primary">
            Ver solicitud en revisión
          </DropdownItem>
        ) : draftApplication ? (
          <DropdownItem key="application-draft" as={Link} href="/onboarding/player/apply" color="primary">
            Continuar solicitud
          </DropdownItem>
        ) : (
          <DropdownItem key="apply" as={Link} href="/onboarding/player/plan" color="primary">
            Solicitar cuenta de jugador
          </DropdownItem>
        )}

        <DropdownItem key="dashboard" as={Link} href="/dashboard">
          Dashboard
        </DropdownItem>
        <DropdownItem key="profile" as={Link} href="/dashboard/edit-profile/personal-data">
          Datos personales
        </DropdownItem>
        <DropdownItem key="football" as={Link} href="/dashboard/edit-profile/football-data">
          Datos futbolísticos
        </DropdownItem>
        <DropdownItem key="media" as={Link} href="/dashboard/edit-profile/multimedia">
          Multimedia
        </DropdownItem>
        <DropdownItem key="template" as={Link} href="/dashboard/edit-template/styles">
          Plantilla
        </DropdownItem>
        <DropdownItem key="billing" as={Link} href="/dashboard/settings/subscription">
          Suscripción
        </DropdownItem>
        <DropdownItem key="settings" as={Link} href="/dashboard/settings/account">
          Configuración
        </DropdownItem>
        <DropdownItem
          key="logout"
          color="danger"
          className="text-danger"
          onPress={() => startTransition(() => onSignOut())}
          isDisabled={pending}
        >
          {pending ? "Cerrando sesión..." : "Cerrar sesión"}
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
