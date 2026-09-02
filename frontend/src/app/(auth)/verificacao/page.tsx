"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function VerificacaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [turnstileReady, setTurnstileReady] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("turnstile_token");
    if (token) {
      router.push("/chat");
    }
  }, [router]);

  const handleVerify = async () => {
    setLoading(true);

    try {
      if (typeof window !== "undefined" && (window as any).turnstile) {
        (window as any).turnstile.execute(TURNSTILE_SITE_KEY, {
          callback: (token: string) => {
            sessionStorage.setItem("turnstile_token", token);
            setTurnstileReady(true);
            router.push("/chat");
          },
        });
      } else {
        // Fallback: if Turnstile is not loaded, proceed anyway
        sessionStorage.setItem("turnstile_token", "bypass");
        router.push("/chat");
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-primary">
            <img src="/logo.png" alt="AutoAssist" className="h-14 w-auto" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-secondary p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            <ShieldCheck className="h-8 w-8 text-accent" />
          </div>

          <h1 className="mb-2 font-display text-2xl font-bold text-primary">
            Verificação de segurança
          </h1>
          <p className="mb-6 text-sm text-secondary">
            Para acessar o chat, precisamos confirmar que você não é um robô.
          </p>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Entrar no chat
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="text-accent hover:text-accent/80">
            Já tem conta? Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
