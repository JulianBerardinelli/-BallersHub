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
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} classNames={{ base: "bg-neutral-950 border border-neutral-800" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-white">Cerrar Sesión</ModalHeader>
              <ModalBody>
                <p className="text-sm text-neutral-400">¿Estás seguro que deseas cerrar tu sesión en BallersHub?</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={pending} className="text-neutral-400">
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
            className="text-danger"
            onPress={onOpen}
          >
            Cerrar sesión
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </>
  );
}
