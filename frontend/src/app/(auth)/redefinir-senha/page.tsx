"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push("/login"), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/api/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Erro ao redefinir senha. O token pode ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary p-8">
      <h1 className="mb-2 text-center font-display text-2xl font-bold text-primary">
        Redefinir Senha
      </h1>
      <p className="mb-6 text-center text-sm text-muted">
        Digite sua nova senha para concluir
      </p>

      {success ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-6 text-center">
          <CheckCircle className="h-10 w-10 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-400">Senha redefinida!</p>
            <p className="mt-1 text-xs text-muted">
              Redirecionando para o login em instantes...
            </p>
          </div>
        </div>
      ) : !token ? (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-6 text-center text-sm text-yellow-400">
          Token de recuperação não encontrado. Solicite um novo link de recuperação.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-secondary">
              Confirmar nova senha
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Redefinir senha
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="text-accent hover:text-accent/80">
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
