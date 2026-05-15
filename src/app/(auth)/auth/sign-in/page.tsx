"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Tabs, Tab, Checkbox } from "@heroui/react";
import { Mail, Lock, Eye, EyeOff, LogIn, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import FormField from "@/components/dashboard/client/FormField";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMagicLink, setSuccessMagicLink] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string | number>("password");
  const [rememberMe, setRememberMe] = useState(true);

  const toggleVisibility = () => setIsVisible(!isVisible);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
    });
  }, [router]);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (selectedTab === "magic") {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?redirect=/dashboard`,
        },
      });
      setLoading(false);
      if (error) return setError(error.message);
      setSuccessMagicLink(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
  }

  async function signInOAuth(provider: "google" | "apple") {
    setError(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?redirect=/dashboard`;
  
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  if (successMagicLink) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-[rgba(0,194,255,0.12)] rounded-full flex items-center justify-center text-bh-blue mb-2 border border-[rgba(0,194,255,0.25)]">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-bh-display text-2xl font-bold uppercase tracking-[-0.005em] text-bh-fg-1">Revisá tu correo</h2>
        <p className="text-sm text-bh-fg-3">
          Enviamos un enlace de acceso rápido a <strong className="text-bh-fg-1 font-medium">{email}</strong>.
        </p>
        <button onClick={() => setSuccessMagicLink(false)} className="mt-8 text-sm text-bh-fg-3 hover:text-bh-fg-1 transition-colors">
          Usar otra cuenta
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="font-bh-display text-3xl font-bold uppercase leading-none tracking-[-0.005em] text-bh-fg-1 mb-2">
          Bienvenido <span className="text-bh-lime">de vuelta</span>
        </h2>
        <p className="text-sm text-bh-fg-3">
          Ingresá para gestionar tu carrera.
        </p>
      </div>

      <form onSubmit={signInWithEmail} className="space-y-4">
        <Tabs 
          fullWidth 
          size="md" 
          aria-label="Opciones de acceso" 
          selectedKey={selectedTab.toString()} 
          onSelectionChange={setSelectedTab}
          classNames={{
            tabList: "rounded-bh-md border border-white/[0.06] bg-bh-surface-1 p-1",
            cursor: "rounded-bh-md bg-white/[0.08] shadow-none",
            tab: "text-bh-fg-3 data-[selected=true]:text-bh-fg-1 transition-colors",
          }}
        >
          <Tab key="password" title="Contraseña">
            <div className="space-y-4 pt-2 animate-in slide-in-from-left-2 duration-300">
              <FormField
                id="bh-si-email"
                type="email"
                label="Correo electrónico"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isRequired
                startContent={<Mail className="w-4 h-4" />}
              />
              <div className="space-y-3">
                <FormField
                  id="bh-si-password"
                  type={isVisible ? "text" : "password"}
                  label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isRequired
                  startContent={<Lock className="w-4 h-4" />}
                  endContent={
                    <button
                      className="text-bh-fg-3 transition-colors hover:text-bh-fg-1 focus:outline-none"
                      type="button"
                      onClick={toggleVisibility}
                      aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <div className="flex items-center justify-between pt-1">
                  <Checkbox
                    isSelected={rememberMe}
                    onValueChange={setRememberMe}
                    classNames={{
                      label: "text-[11px] text-bh-fg-3",
                      wrapper:
                        "before:border-white/[0.18] after:bg-bh-lime group-data-[selected=true]:after:bg-bh-lime",
                    }}
                    size="sm"
                  >
                    Mantener sesión iniciada
                  </Checkbox>

                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] text-bh-fg-3 transition-colors hover:text-bh-lime"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
            </div>
          </Tab>
          <Tab key="magic" title="Enlace Mágico">
            <div className="space-y-4 pt-2 animate-in slide-in-from-right-2 duration-300">
              <FormField
                id="bh-si-magic-email"
                type="email"
                label="Correo electrónico"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isRequired
                startContent={<Mail className="w-4 h-4" />}
              />
              <p className="px-2 text-center text-[11px] leading-relaxed text-bh-fg-4">
                Recibirás un enlace por correo que te permitirá entrar sin usar
                contraseña.
              </p>
            </div>
          </Tab>
        </Tabs>

        {error && (
          <div className="rounded-bh-md border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-sm text-bh-danger">
            {error}
          </div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          startContent={!loading && <LogIn className="w-4 h-4" />}
          className="w-full bg-bh-lime text-bh-black font-semibold text-base py-6 rounded-xl shadow-[0_2px_12px_rgba(204,255,0,0.35)] hover:bg-[#d8ff26] hover:shadow-[0_6px_24px_rgba(204,255,0,0.35)] transition-all"
        >
          {loading ? "Ingresando..." : (selectedTab === "magic" ? "Recibir enlace" : "Iniciar sesión")}
        </Button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <span className="flex-1 h-px bg-white/10" />
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">o continúa con</span>
        <span className="flex-1 h-px bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => signInOAuth("google")} className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-3 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm font-medium text-white">Google</span>
        </button>
        <button onClick={() => signInOAuth("apple")} className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 py-3 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.25.68 2.92.68.66 0 1.91-.76 3.47-.63 1.39.06 2.54.58 3.23 1.5-3.41 1.76-2.73 6.03.45 7.2-.68 1.63-1.39 3.09-2.07 4.22-.05.07-.05.07 0 0zm-5.18-13.6c-.19-1.93 1.4-3.76 3.37-4.05.34 2.13-1.63 3.86-3.37 4.05z" />
          </svg>
          <span className="text-sm font-medium text-white">Apple</span>
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-neutral-400">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/sign-up" className="text-white hover:underline transition-all">
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
