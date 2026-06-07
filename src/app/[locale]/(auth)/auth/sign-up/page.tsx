"use client";

import { supabase } from "@/lib/supabase/client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import FormField from "@/components/dashboard/client/FormField";

export default function SignUpPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?redirect=/dashboard`,
      },
    });
    setLoading(false);

    if (error) return setError(error.message);

    // Show success state
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-[rgba(0,194,255,0.12)] rounded-full flex items-center justify-center text-bh-blue mb-2 border border-[rgba(0,194,255,0.25)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">{t("signUp.successTitle")}</h2>
        <p className="text-sm text-bh-fg-3">
          {t.rich("signUp.successText", {
            email,
            strong: (c) => <strong className="text-bh-fg-1 font-medium">{c}</strong>,
          })}
          <br /> {t("signUp.successActivate")}
        </p>
        <p className="text-xs text-bh-fg-4 mt-4">
          {t("signUp.successSpam")}
        </p>
        <Link href="/auth/sign-in" className="mt-8 text-sm bg-white/5 hover:bg-white/10 text-bh-fg-1 w-full py-3 rounded-xl transition-colors text-center">
          {t("signUp.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 mb-2">
          {t.rich("signUp.title", { hl: (c) => <span className="text-bh-lime">{c}</span> })}
        </h2>
        <p className="text-sm text-bh-fg-3">
          {t("signUp.subtitle")}
        </p>
      </div>

      <form onSubmit={signUpWithEmail} className="space-y-4">
        <FormField
          id="bh-su-email"
          type="email"
          label={t("fields.email")}
          placeholder={t("fields.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          isRequired
          startContent={<Mail className="w-4 h-4" />}
        />

        <FormField
          id="bh-su-password"
          type={isVisible ? "text" : "password"}
          label={t("fields.password")}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          isRequired
          minLength={8}
          startContent={<Lock className="w-4 h-4" />}
          endContent={
            <button
              className="text-bh-fg-3 transition-colors hover:text-bh-fg-1 focus:outline-none"
              type="button"
              onClick={toggleVisibility}
              aria-label={isVisible ? t("fields.hidePassword") : t("fields.showPassword")}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        {error && (
          <div className="rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-bh-danger">
            {error}
          </div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          startContent={!loading && <UserPlus className="w-4 h-4" />}
          className="w-full bg-bh-lime text-bh-black font-semibold text-base py-6 rounded-xl shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] transition-all mt-2"
        >
          {loading ? t("signUp.submitting") : t("signUp.submit")}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-neutral-400">
          {t("signUp.haveAccount")}{" "}
          <Link href="/auth/sign-in" className="text-white hover:underline transition-all">
            {t("signUp.signInCta")}
          </Link>
        </p>
      </div>
    </div>
  );
}
