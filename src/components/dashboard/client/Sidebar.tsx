"use client";

import clsx from "classnames";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import {
  Badge,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  ScrollShadow,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Menu } from "lucide-react";
import type {
  ClientDashboardNavSection,
  ClientDashboardNavItem,
  ClientDashboardNavBadge,
} from "@/app/(dashboard)/dashboard/navigation";
import type { TaskSeverity } from "@/lib/dashboard/client/tasks";

const MAX_BADGE_COUNT = 99;

const badgeColorMap: Record<
  TaskSeverity,
  "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
  danger: "danger",
  warning: "warning",
  secondary: "secondary",
};

export default function ClientDashboardSidebar({
  sections,
  onSignOut,
}: {
  sections: ClientDashboardNavSection[];
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const handleSignOut = () => {
    startTransition(() => {
      onSignOut().then(() => onClose());
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

      <nav className="space-y-8">
        <SidebarContent
          sections={sections}
          pathname={pathname}
          pending={pending}
          onSignOut={onOpen}
        />
      </nav>
    </>
  );
}

export function ClientDashboardSidebarMobile({
  sections,
  onSignOut,
}: {
  sections: ClientDashboardNavSection[];
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isModalOpen, onOpen: onModalOpen, onOpenChange: onModalOpenChange, onClose: onModalClose } = useDisclosure();

  const handleSignOut = () => {
    startTransition(() => {
      onSignOut().then(() => {
        onModalClose();
      });
    });
  };

  return (
    <div className="lg:hidden">
      <Modal isOpen={isModalOpen} onOpenChange={onModalOpenChange} classNames={{ base: "bg-neutral-950 border border-neutral-800" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="text-white">Cerrar Sesión</ModalHeader>
              <ModalBody>
                <p className="text-sm text-neutral-400">¿Estás seguro que deseas cerrar tu sesión en BallersHub?</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onModalClose} isDisabled={pending} className="text-neutral-400">
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

      <Button
        variant="flat"
        radius="sm"
        startContent={<Menu className="size-5" />}
        className="w-full justify-start border border-neutral-800 bg-neutral-950/60 text-neutral-100"
        onPress={onOpen}
      >
        Menú principal
      </Button>

      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="left"
        classNames={{
          base: "bg-neutral-950 text-neutral-100",
          backdrop: "bg-black/60",
        }}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="border-b border-neutral-800 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Navegación
              </DrawerHeader>
              <DrawerBody className="px-0">
                <ScrollShadow className="max-h-[calc(100vh-9rem)] space-y-8 px-6 py-4">
                  <SidebarContent
                    sections={sections}
                    pathname={pathname}
                    pending={pending}
                    onSignOut={onModalOpen}
                    onNavigate={onClose}
                  />
                </ScrollShadow>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function SidebarItem({
  item,
  currentPath,
  pending,
  onSignOut,
  onNavigate,
}: {
  item: ClientDashboardNavItem;
  currentPath: string;
  pending: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  if (item.kind === "action") {
    return (
      <button
        type="button"
        onClick={onSignOut}
        disabled={pending}
        className="w-full rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="font-medium text-neutral-100 flex items-center justify-between">
          <span>{item.title}</span>
        </div>
        {item.description ? (
          <p className="text-xs text-neutral-500 mt-1">{item.description}</p>
        ) : null}
      </button>
    );
  }

  const linkItem = item as Extract<ClientDashboardNavItem, { kind: "link" }>;
  const active = isActive(currentPath, linkItem.href);

  const link = (
    <Link
      href={linkItem.href}
      className={clsx(
        "block rounded-md border px-3 py-2 text-sm transition-colors",
        active
          ? "border-neutral-700 bg-neutral-900 text-neutral-100"
          : "border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:bg-neutral-900"
      )}
      data-active={active}
      onClick={onNavigate}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-neutral-100">{linkItem.title}</span>
      </div>
      {linkItem.description ? (
        <p className="mt-1 text-xs text-neutral-500">{linkItem.description}</p>
      ) : null}
    </Link>
  );

  const badge: ClientDashboardNavBadge | undefined = linkItem.badge;

  if (!badge || badge.count === 0) {
    return link;
  }

  return (
    <Badge
      content={formatBadgeCount(badge.count)}
      color={badgeColorMap[badge.severity]}
      size="sm"
      placement="top-right"
      classNames={{
        base: "relative block w-full",
        badge: "px-1.5 py-0.5 text-[10px] font-semibold",
      }}
    >
      <div className="w-full">{link}</div>
    </Badge>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatBadgeCount(count: number): string {
  if (count > MAX_BADGE_COUNT) {
    return `${MAX_BADGE_COUNT}+`;
  }
  return String(count);
}

function SidebarContent({
  sections,
  pathname,
  pending,
  onSignOut,
  onNavigate,
}: {
  sections: ClientDashboardNavSection[];
  pathname: string;
  pending: boolean;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return sections.map((section) => (
    <div key={section.id} className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {section.title}
      </p>
      <div className="space-y-1">
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            currentPath={pathname}
            pending={pending}
            onSignOut={onSignOut}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  ));
}
