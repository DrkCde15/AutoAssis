import { HelpCircle, MessageCircleQuestion, ShieldCheck } from 'lucide-react'

const points = [
  {
    icon: <HelpCircle className="h-5 w-5" />,
    title: 'Hipóteses, não diagnósticos',
    description:
      'O NOG fornece possíveis causas com base em padrões. O diagnóstico final é sempre do profissional.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: <MessageCircleQuestion className="h-5 w-5" />,
    title: 'Perguntas ao mecânico',
    description:
      'O AutoAssist te prepara com as perguntas certas para fazer ao seu mecânico de confiança.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Dados protegidos',
    description:
      'Suas informações são criptografadas e nunca são compartilhadas com terceiros.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
]

export default function TrustSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            O NOG não substitui o mecânico.
          </h2>
          <p className="mt-4 text-lg text-secondary">
            A inteligência artificial é uma ferramenta de apoio. Ela te ajuda a
            entender melhor o problema, mas a decisão e o reparo sempre devem ser
            feitos por um profissional qualificado.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {points.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-secondary p-6 text-center"
            >
              <div
                className={`mx-auto mb-4 inline-flex rounded-xl p-3 ${p.bg} ${p.color}`}
              >
                {p.icon}
              </div>
              <h3 className="text-base font-semibold text-primary">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
