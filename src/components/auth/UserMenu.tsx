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
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Check } from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { LOCALE_LABEL } from "@/i18n/config";
import { LocaleFlag } from "@/components/i18n/LocaleFlag";
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
  onboardingHref = "/onboarding/start",
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
  onboardingHref?: string;
  onSignOut: () => Promise<void>;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // Switch language without leaving the page: navigate to the SAME route
  // under the new locale (next-intl persists it in the NEXT_LOCALE cookie).
  // Preserve query + hash so filters/anchors survive — mirrors
  // <LocaleSwitcher />. The resulting navigation closes the dropdown.
  const onSelectLocale = (next: Locale) => {
    if (next === locale) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`${pathname}${search}${hash}`, { locale: next });
  };

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
              <ModalHeader className="font-bh-display uppercase tracking-[-0.005em] text-bh-fg-1">{t("userMenu.signOut")}</ModalHeader>
              <ModalBody>
                <p className="text-sm text-bh-fg-3">{t("userMenu.signOutConfirm")}</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={pending} className="text-bh-fg-3">
                  {t("actions.cancel")}
                </Button>
                <Button color="danger" isLoading={pending} onPress={handleSignOut}>
                  {pending ? t("userMenu.signingOut") : t("userMenu.signOut")}
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
          <button aria-label={t("userMenu.openMenu")} className="rounded-bh-md transition-colors hover:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-bh-lime/40">
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
          aria-label={t("userMenu.userActions")}
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
              {t("userMenu.signedInAs")}
            </p>
            <p className="truncate text-[12px] text-bh-fg-2">{email}</p>
          </DropdownItem>

          {role === "manager" ? (
            managerApplicationStatus === "pending" || managerApplicationStatus === "draft" ? (
              <DropdownItem key="manager-status" color="primary" className="cursor-default" isReadOnly>
                {t("userMenu.agencyInReview")}
              </DropdownItem>
            ) : null
          ) : hasPlayerProfile && playerSlug ? (
            <DropdownItem key="public-profile" as={Link} href={`/${playerSlug}`}>
              {t("userMenu.viewPublicProfile")}
            </DropdownItem>
          ) : activeApplication ? (
            <DropdownItem key="application-status" as={Link} href="/onboarding/player/apply" color="primary">
              {t("userMenu.viewApplication")}
            </DropdownItem>
          ) : draftApplication ? (
            <DropdownItem key="application-draft" as={Link} href="/onboarding/player/apply" color="primary">
              {t("userMenu.continueApplication")}
            </DropdownItem>
          ) : (
            <DropdownItem key="apply" as={Link} href={onboardingHref} color="primary">
              {t("userMenu.applyPro")}
            </DropdownItem>
          )}

          <DropdownItem key="dashboard" as={Link} href="/dashboard">
            {t("userMenu.dashboard")}
          </DropdownItem>

          {role === "manager" ? (
            <>
              {agencySlug && (
                 <DropdownItem key="agency-public" as={Link} href={`/agency/${agencySlug}`}>
                   {t("userMenu.viewAgencyPublic")}
                 </DropdownItem>
              )}
              <DropdownItem key="agency-settings" as={Link} href="/dashboard/agency">
                {t("userMenu.agencySettings")}
              </DropdownItem>
              <DropdownItem key="manager-profile" as={Link} href="/dashboard/profile">
                {t("userMenu.managerProfile")}
              </DropdownItem>
            </>
          ) : (
            <>
              <DropdownItem key="profile" as={Link} href="/dashboard/edit-profile/personal-data">
                {t("userMenu.personalData")}
              </DropdownItem>
              <DropdownItem key="football" as={Link} href="/dashboard/edit-profile/football-data">
                {t("userMenu.footballData")}
              </DropdownItem>
              <DropdownItem key="media" as={Link} href="/dashboard/edit-profile/multimedia">
                {t("userMenu.media")}
              </DropdownItem>
              <DropdownItem key="template" as={Link} href="/dashboard/edit-template/styles">
                {t("userMenu.template")}
              </DropdownItem>
            </>
          )}

          <DropdownItem key="billing" as={Link} href="/dashboard/settings/subscription">
            {t("userMenu.subscription")}
          </DropdownItem>
          <DropdownItem key="settings" as={Link} href="/dashboard/settings/account">
            {t("userMenu.settings")}
          </DropdownItem>
          <DropdownItem
            key="language-heading"
            className="h-auto gap-0 border-t border-white/[0.06] !rounded-none pt-2 pb-1 mt-1 cursor-default data-[hover=true]:!bg-transparent"
            isReadOnly
            textValue={t("userMenu.language")}
          >
            <p className="font-bh-display text-[10px] font-bold uppercase tracking-[0.12em] text-bh-fg-4">
              {t("userMenu.language")}
            </p>
          </DropdownItem>

          <>
            {routing.locales.map((l) => (
              <DropdownItem
                key={`locale-${l}`}
                aria-label={LOCALE_LABEL[l]}
                startContent={<LocaleFlag locale={l} size={16} />}
                endContent={l === locale ? <Check size={14} className="text-bh-lime" aria-hidden /> : null}
                className={l === locale ? "text-bh-fg-1" : undefined}
                onPress={() => onSelectLocale(l)}
              >
                {LOCALE_LABEL[l]}
              </DropdownItem>
            ))}
          </>

          <DropdownItem
            key="logout"
            color="danger"
            className="text-bh-danger data-[hover=true]:!bg-[rgba(239,68,68,0.08)] data-[hover=true]:!text-bh-danger border-t border-white/[0.06] !rounded-none mt-1"
            onPress={onOpen}
          >
            {t("userMenu.signOut")}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </>
  );
}
