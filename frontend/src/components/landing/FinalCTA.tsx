import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-secondary px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Pronto para entender seu carro?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-secondary">
              Comece agora gratuitamente. Diagnosticar seu carro com a NOG leva
              menos de um minuto.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40"
              >
                Falar com o NOG
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-secondary transition-colors hover:border-text-muted hover:text-primary"
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
