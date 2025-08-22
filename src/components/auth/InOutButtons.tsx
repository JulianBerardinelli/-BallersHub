// src/components/auth/InOutButtons.tsx
"use client";

import { Button } from "@heroui/react";
import NextLink from "next/link";

export default function InOutButtons() {
  return (
    <div className="flex items-center gap-3">
      <Button as={NextLink} href="/auth/sign-in" variant="flat">
        Acceder
      </Button>
      <Button as={NextLink} href="/auth/sign-up" color="primary">
        Crear cuenta
      </Button>
    </div>
  );
}
