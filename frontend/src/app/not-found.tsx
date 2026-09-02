import Link from "next/link";
import { Home, Compass, Star } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-primary px-4 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <Compass size={14} />
          Erro 404
        </span>

        <h1 className="font-display font-bold text-primary" style={{ fontSize: "clamp(5rem, 20vw, 13rem)", lineHeight: 1 }}>
          4<span className="text-accent">0</span>4
        </h1>

        <h2 className="mt-4 text-2xl font-bold text-primary">Página não encontrada</h2>
        <p className="mx-auto mt-4 max-w-md text-secondary">
          O endereço que você tentou acessar não existe, foi movido ou está temporariamente indisponível.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover"
          >
            <Home size={16} />
            Voltar ao início
          </Link>
          <Link
            href="/planos"
            className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-secondary transition-all hover:border-text-muted hover:text-primary"
          >
            <Star size={16} />
            Ver planos
          </Link>
        </div>

        <p className="mt-8 text-sm text-muted">
          Precisa de ajuda? Visite as{" "}
          <Link href="/duvidas" className="text-accent hover:underline">
            dúvidas frequentes
          </Link>{" "}
          ou o canal de{" "}
          <Link href="/feedback" className="text-accent hover:underline">
            feedback
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
