"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      getResponse: (widgetId: string) => string | undefined;
      reset: (widgetId: string) => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [redirectTo, setRedirectTo] = useState("/");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>("");
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get("redirect") || "/");
  }, []);

  const initTurnstile = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !window.turnstile || !turnstileRef.current) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: () => setTurnstileLoaded(true),
      "error-callback": () => setTurnstileLoaded(false),
      theme: "dark",
      appearance: "interaction-only",
    });
  }, []);

  useEffect(() => {
    if (window.turnstile) {
      initTurnstile();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => initTurnstile();
    document.head.appendChild(script);
  }, [initTurnstile]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const getTurnstileToken = (): string | undefined => {
    if (!window.turnstile || !widgetIdRef.current) return undefined;
    return window.turnstile.getResponse(widgetIdRef.current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = getTurnstileToken();
      await login(email, password, token);
      router.push(redirectTo);
    } catch (err: any) {
      if (err?.two_factor_required) {
        setTwoFactorRequired(true);
      } else {
        setError(err?.message || "Credenciais inválidas. Tente novamente.");
        if (window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current);
          setTurnstileLoaded(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = getTurnstileToken();
      await login(email, password, token);
      router.push(redirectTo);
    } catch (err: any) {
      setError(err?.message || "Código inválido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary p-8">
      <h1 className="mb-6 text-center font-display text-2xl font-bold text-primary">
        Entrar na sua conta
      </h1>

      <a
        href={`${API_URL}/api/auth/google/login`}
        className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-border/50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Entrar com Google
      </a>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-secondary px-3 text-muted">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {twoFactorRequired ? (
        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-center text-sm text-secondary">
            Informe o código do seu autenticador para continuar.
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary">
              Código de dois fatores
            </label>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              required
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-center text-lg tracking-[0.5em] text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verificar
          </button>
          <button
            type="button"
            onClick={() => {
              setTwoFactorRequired(false);
              setTwoFactorCode("");
            }}
            className="w-full text-center text-sm text-muted hover:text-secondary"
          >
            Usar outra conta
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-border bg-secondary px-4 py-3 pr-11 text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {TURNSTILE_SITE_KEY && <div ref={turnstileRef} />}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col items-center gap-3 text-sm">
        <Link href="/cadastro" className="text-accent hover:text-accent/80">
          Não tem conta? Criar conta
        </Link>
        <Link href="/esqueci-senha" className="text-muted hover:text-secondary">
          Esqueci minha senha
        </Link>
      </div>
    </div>
  );
}
