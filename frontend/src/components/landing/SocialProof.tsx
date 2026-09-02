import { Activity, Car, Users } from 'lucide-react'

const metrics = [
  {
    icon: <Activity className="h-5 w-5" />,
    value: '0',
    label: 'Diagnósticos realizados',
  },
  {
    icon: <Car className="h-5 w-5" />,
    value: '0',
    label: 'Veículos cadastrados',
  },
  {
    icon: <Users className="h-5 w-5" />,
    value: '0',
    label: 'Usuários ativos',
  },
]

export default function SocialProof() {
  return (
    <section className="relative bg-secondary py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            O que os usuários dizem
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-border bg-secondary p-6 text-center"
            >
              <div className="mx-auto mb-3 inline-flex rounded-xl bg-accent/10 p-3 text-accent">
                {m.icon}
              </div>
              <p className="font-display text-4xl font-bold text-primary">
                {m.value}
              </p>
              <p className="mt-1 text-sm text-muted">{m.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Valores serão atualizados em breve.
        </p>
      </div>
    </section>
  )
}
