"use client";

// Shared modal for soft-save and hard-cap gates. Other components open it
// imperatively via the `useUpgradeModal()` hook. Title and body are taken
// from the feature's gate config; callers can override.

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
} from "@heroui/react";
import { useCallback, useState } from "react";
import { Lock } from "lucide-react";
import {
  FEATURE_GATES,
  type FeatureId,
} from "@/lib/dashboard/feature-gates";
import UpgradeCta from "./UpgradeCta";

export type UpgradeModalState = {
  open: boolean;
  feature: FeatureId | null;
  /** Optional override for the modal copy. */
  override?: {
    title?: string;
    body?: string;
  };
};

const INITIAL_STATE: UpgradeModalState = {
  open: false,
  feature: null,
};

export function useUpgradeModal() {
  const [state, setState] = useState<UpgradeModalState>(INITIAL_STATE);

  const open = useCallback(
    (feature: FeatureId, override?: UpgradeModalState["override"]) => {
      setState({ open: true, feature, override });
    },
    [],
  );

  const close = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { state, open, close };
}

export type UpgradeModalProps = {
  state: UpgradeModalState;
  onClose: () => void;
};

export default function UpgradeModal({ state, onClose }: UpgradeModalProps) {
  const feature = state.feature;
  const gate = feature ? FEATURE_GATES[feature] : null;
  const title = state.override?.title ?? gate?.copy?.title ?? "Activá Pro";
  const body =
    state.override?.body ??
    gate?.copy?.body ??
    "Esta funcionalidad es parte del plan Pro. Activalo para desbloquear.";

  return (
    <Modal
      isOpen={state.open}
      onClose={onClose}
      backdrop="blur"
      placement="center"
      classNames={{
        base: "bg-bh-surface-1 border border-white/[0.08]",
      }}
    >
      <ModalContent>
        {(closeFn) => (
          <>
            <ModalHeader className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-bh-md bg-bh-lime/15 text-bh-lime">
                <Lock size={14} />
              </span>
              <span className="font-bh-display text-base font-bold uppercase tracking-[-0.005em] text-bh-fg-1">
                {title}
              </span>
            </ModalHeader>
            <ModalBody>
              <p className="text-[13.5px] leading-[1.6] text-bh-fg-2">{body}</p>
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="light"
                onPress={closeFn}
                className="text-bh-fg-3"
              >
                Ahora no
              </Button>
              {feature ? <UpgradeCta feature={feature} size="md" /> : <UpgradeCta size="md" />}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
