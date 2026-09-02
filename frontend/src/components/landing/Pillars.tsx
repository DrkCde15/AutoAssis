import { Stethoscope, ClipboardList, TrendingUp, Puzzle, Check } from 'lucide-react'

const pillars = [
  {
    icon: <Stethoscope className="h-5 w-5" />,
    title: 'Diagnóstico',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    accentLine: 'bg-blue-500',
    features: [
      'NOG IA integrada',
      'Análise por texto, foto e áudio',
      'Hipóteses com nível de risco',
      'Recomendações orientadas',
    ],
  },
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: 'Gestão',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    accentLine: 'bg-emerald-500',
    features: [
      'Histórico de diagnósticos',
      'Alertas de manutenção',
      'Calendário preventivo',
      'Timeline do veículo',
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Valor',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    accentLine: 'bg-amber-500',
    features: [
      'Tabela FIPE integrada',
      'Valor de mercado em tempo real',
      'Acompanhamento de preço',
      'Insights de depreciation',
    ],
  },
  {
    icon: <Puzzle className="h-5 w-5" />,
    title: 'Ecossistema',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    accentLine: 'bg-purple-500',
    features: [
      'Rede de oficinas parceiras',
      'Busca de peças compatíveis',
      'Integração com seguradoras',
      'Marketplace automotivo',
    ],
  },
]

export default function Pillars() {
  return (
    <section id="pilares" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Mais que um diagnóstico.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            O AutoAssist é um ecossistema completo para cuidar do seu veículo com
            inteligência.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <div
              key={p.title}
              className={`group relative overflow-hidden rounded-2xl border ${p.border} bg-secondary p-6 transition-all hover:-translate-y-1 hover:shadow-lg`}
            >
              <div
                className={`absolute left-0 top-0 h-1 w-full ${p.accentLine}`}
              />
              <div
                className={`mb-4 inline-flex rounded-lg p-2.5 ${p.bg} ${p.color}`}
              >
                {p.icon}
              </div>
              <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.color}`} />
                    <span className="text-sm text-secondary">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
