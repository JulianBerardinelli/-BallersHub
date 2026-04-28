"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  User as HeroUser,
  Avatar,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
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
  role = "player",
  agencySlug,
  managerApplicationStatus,
  onSignOut,
}: {
  displayName: string;
  email: string;
  handle?: string | null;
  avatarUrl?: string | null;
  hasPlayerProfile: boolean;
  playerSlug?: string | null;
  applicationStatus?: string | null;
  role?: "player" | "manager" | "admin" | "member";
  agencySlug?: string | null;
  managerApplicationStatus?: string | null;
  onSignOut: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const normalizedApplicationStatus = normalizeApplicationStatus(applicationStatus ?? null);
  const activeApplication = hasActiveApplication(normalizedApplicationStatus);
  const draftApplication = isApplicationDraft(normalizedApplicationStatus);

  const handleSignOut = () => {
    startTransition(() => {
      onSignOut().then(() => {
        onClose();
      });
    });
  };

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} classNames={{ base: "bg-bh-surface-1 border border-white/[0.08]" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="font-bh-display uppercase tracking-[-0.005em] text-bh-fg-1">Cerrar sesión</ModalHeader>
              <ModalBody>
                <p className="text-sm text-bh-fg-3">¿Estás seguro que deseas cerrar tu sesión en &apos;BallersHub?</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={pending} className="text-bh-fg-3">
                  Cancelar
                </Button>
                <Button color="danger" isLoading={pending} onPress={handleSignOut}>
                  {pending ? "Saliendo..." : "Cerrar sesión"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Dropdown
        placement="bottom-end"
        classNames={{
          content:
            "bg-bh-surface-1 border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.7)] p-1 rounded-bh-lg min-w-[240px]",
        }}
      >
        <DropdownTrigger>
          <button aria-label="Abrir menú de usuario" className="rounded-bh-md transition-colors hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-bh-lime/40">
            <HeroUser
              as="div"
              name={displayName}
              description={handle ?? email}
              className="cursor-pointer px-2 py-1"
              classNames={{
                name: "text-[12px] font-medium text-bh-fg-1",
                description: "text-[10px] text-bh-fg-3",
              }}
              avatarProps={{
                isBordered: true,
                src: avatarUrl ?? undefined,
                fallback: <Avatar name={displayName} />,
                className: "ring-2 ring-[rgba(204,255,0,0.3)] w-8 h-8",
                size: "sm",
              }}
            />
          </button>
        </DropdownTrigger>

        <DropdownMenu
          aria-label="Acciones de usuario"
          variant="flat"
          itemClasses={{
            base:
              "rounded-bh-md text-bh-fg-2 data-[hover=true]:bg-white/[0.05] data-[hover=true]:text-bh-fg-1 data-[selectable=true]:focus:bg-white/[0.05]",
            title: "text-[13px]",
          }}
        >
          <DropdownItem
            key="signed-in"
            className="h-14 gap-1 border-b border-white/[0.06] !rounded-none data-[hover=true]:!bg-transparent"
            isReadOnly
          >
            <p className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
              Sesión iniciada como
            </p>
            <p className="truncate text-[12px] text-bh-fg-2">{email}</p>
          </DropdownItem>

          {role === "manager" ? (
            managerApplicationStatus === "pending" || managerApplicationStatus === "draft" ? (
              <DropdownItem key="manager-status" color="primary" className="cursor-default" isReadOnly>
                Agencia en revisión
              </DropdownItem>
            ) : null
          ) : hasPlayerProfile && playerSlug ? (
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
            <DropdownItem key="apply" as={Link} href="/onboarding/start" color="primary">
              Solicitar cuenta de profesional
            </DropdownItem>
          )}

          <DropdownItem key="dashboard" as={Link} href="/dashboard">
            Dashboard
          </DropdownItem>

          {role === "manager" ? (
            <>
              {agencySlug && (
                 <DropdownItem key="agency-public" as={Link} href={`/agency/${agencySlug}`}>
                   Ver perfil público de Agencia
                 </DropdownItem>
              )}
              <DropdownItem key="agency-settings" as={Link} href="/dashboard/agency">
                Configuración de Agencia
              </DropdownItem>
              <DropdownItem key="manager-profile" as={Link} href="/dashboard/profile">
                Mi Perfil Manager
              </DropdownItem>
            </>
          ) : (
            <>
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
            </>
          )}

          <DropdownItem key="billing" as={Link} href="/dashboard/settings/subscription">
            Suscripción
          </DropdownItem>
          <DropdownItem key="settings" as={Link} href="/dashboard/settings/account">
            Configuración general
          </DropdownItem>
          <DropdownItem
            key="logout"
            color="danger"
            className="text-bh-danger data-[hover=true]:!bg-[rgba(239,68,68,0.08)] data-[hover=true]:!text-bh-danger border-t border-white/[0.06] !rounded-none mt-1"
            onPress={onOpen}
          >
            Cerrar sesión
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </>
  );
}
