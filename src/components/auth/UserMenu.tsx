"use client";

import {
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  User as HeroUser, Avatar
} from "@heroui/react";
import Link from "next/link";
import { useTransition } from "react";

export default function UserMenuHero({
  displayName,
  email,
  handle,
  avatarUrl,
  hasPlayerProfile,   // ahora significa: “público & aprobado”
  playerSlug,
  onSignOut,
}: {
  displayName: string;
  email: string;
  handle?: string | null;
  avatarUrl?: string | null;
  hasPlayerProfile: boolean;
  playerSlug?: string | null;
  onSignOut: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

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
        ) : (
          // 🔹 Primero ver planes; desde ahí ir al apply
          <DropdownItem key="apply" as={Link} href="/onboarding/player/plan" color="primary">
            Solicitar cuenta de jugador
          </DropdownItem>
        )}

        <DropdownItem key="dashboard" as={Link} href="/dashboard">
          Dashboard
        </DropdownItem>
        <DropdownItem key="profile" as={Link} href="/dashboard/profile">
          Editar perfil
        </DropdownItem>
        <DropdownItem key="media" as={Link} href="/dashboard/media">
          Media
        </DropdownItem>
        <DropdownItem key="career" as={Link} href="/dashboard/career">
          Trayectoria
        </DropdownItem>
        <DropdownItem key="billing" as={Link} href="/dashboard/billing">
          Suscripción
        </DropdownItem>
        <DropdownItem key="settings" as={Link} href="/dashboard/settings">
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
