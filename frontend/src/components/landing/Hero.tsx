import Link from 'next/link'
import { Bot, ArrowRight, Shield } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5">
            <Bot className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              Seu consultor automotivo inteligente
            </span>
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl">
            Entenda seu carro
            <br />
            antes de gastar dinheiro.
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-secondary sm:text-xl">
            O AutoAssist utiliza a{' '}
            <span className="font-semibold text-primary">
              Inteligência Artificial NOG
            </span>{' '}
            para diagnosticar seu veículo por áudio, foto ou texto, e te ajudar a
            tomar decisões mais inteligentes sobre manutenção e valor.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40"
            >
              Diagnosticar meu carro
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#pilares"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-secondary transition-colors hover:border-text-muted hover:text-primary"
            >
              Conhecer o AutoAssist
            </Link>
          </div>

          <div className="mt-12 inline-flex items-center gap-2 text-sm text-muted">
            <Shield className="h-4 w-4" />
            <span>Dados protegidos e criptografados · Conforme a LGPD</span>
          </div>
        </div>

        <div className="mt-16 flex justify-center">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-accent/20">
            <img
              src="/car.png"
              alt="Veículo automotivo em exploded view com interface holográfica de diagnóstico"
              className="h-auto w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" style={{ top: '30%', animation: 'scan 4s ease-in-out infinite' }} />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg border border-accent/20 bg-primary/80 px-4 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-medium text-accent">SISTEMA DE DIAGNOSTICO ATIVO</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-secondary">
                <span>Motor: OK</span>
                <span className="text-accent">Transmissao: 87%</span>
                <span>Freios: OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
