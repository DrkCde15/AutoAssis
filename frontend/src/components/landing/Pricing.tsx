import { Check, Crown, Bot, TableProperties, FileText, Bell, Car } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '',
    description: 'Para quem quer conhecer o AutoAssist.',
    features: [
      { icon: <Bot className="h-4 w-4" />, text: 'NOG IA com uso limitado' },
      { icon: <TableProperties className="h-4 w-4" />, text: 'Consulta FIPE' },
      { icon: <Car className="h-4 w-4" />, text: '1 veículo cadastrado' },
    ],
    cta: 'Começar grátis',
    href: '/register',
    featured: false,
  },
  {
    name: 'Premium',
    price: 'R$ 19,90',
    period: '/mês',
    description: 'Para quem quer cuidar do carro com seriedade.',
    features: [
      { icon: <Bot className="h-4 w-4" />, text: 'NOG IA ilimitada' },
      { icon: <Car className="h-4 w-4" />, text: 'Veículos ilimitados' },
      { icon: <FileText className="h-4 w-4" />, text: 'Laudo de revenda em PDF' },
      { icon: <Bell className="h-4 w-4" />, text: 'Alertas de manutenção' },
      { icon: <Crown className="h-4 w-4" />, text: 'Suporte prioritário' },
    ],
    cta: 'Quero ser Premium',
    href: '/register?plan=premium',
    featured: true,
  },
]

export default function Pricing() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Cuide do seu carro o ano inteiro.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            Escolha o plano ideal para você. Comece grátis, evolua quando quiser.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.featured
                  ? 'border-accent bg-secondary shadow-lg shadow-accent/10'
                  : 'border-border bg-secondary'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                  Mais popular
                </div>
              )}

              <h3 className="text-lg font-semibold text-primary">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-primary">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-secondary">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        plan.featured ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted'
                      }`}
                    >
                      {f.icon}
                    </div>
                    <span className="text-sm text-secondary">{f.text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition-colors ${
                  plan.featured
                    ? 'bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent-hover'
                    : 'border border-border text-secondary hover:border-text-muted hover:text-primary'
                }`}
              >
                {plan.featured && <Crown className="h-4 w-4" />}
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
