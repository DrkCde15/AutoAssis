"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/api/auth/forgot-password", { email });
    } catch {
      // Silently ignore errors for security (anti-enumeration)
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary p-8">
      <h1 className="mb-2 text-center font-display text-2xl font-bold text-primary">
        Recuperar Senha
      </h1>
      <p className="mb-6 text-center text-sm text-muted">
        Recuperar acesso à sua conta
      </p>

      {sent ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-400">E-mail enviado!</p>
              <p className="mt-1 text-xs text-muted">
                Se existir uma conta com o e-mail informado, você receberá um link para
                redefinir sua senha. Verifique também a caixa de spam.
              </p>
            </div>
          </div>
        </div>
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

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar Link de Recuperação
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="text-accent hover:text-accent/80">
          Lembrou sua senha? Voltar para Login
        </Link>
      </div>
    </div>
  );
}
