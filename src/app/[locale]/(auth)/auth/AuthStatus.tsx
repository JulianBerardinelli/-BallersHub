"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <p className="text-sm text-neutral-600">
      {email ? `Sesión: ${email}` : "No has iniciado sesión"}
    </p>
  );
}
