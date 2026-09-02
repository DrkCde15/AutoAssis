import { AlertCircle, AlertTriangle, Wrench, Banknote, ArrowRight } from 'lucide-react'

const steps = [
  {
    icon: <AlertCircle className="h-5 w-5" />,
    title: 'Pequeno sintoma',
    description: 'Um leve rangido, uma luz no painel, um cheiro estranho.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: 'Problema ignorado',
    description: '"É coisa boba, vai passar." O sintoma se repete e piora.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: 'Desgaste acelerado',
    description: 'Peças auxiliares são comprometidas por falta de intervenção.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: <Banknote className="h-5 w-5" />,
    title: 'Reparo mais caro',
    description: 'O que custaria R$200 agora pode custar R$2.000 ou mais.',
    color: 'text-red-500',
    bg: 'bg-red-600/10',
    border: 'border-red-600/20',
  },
]

export default function PainSection() {
  return (
    <section className="relative bg-secondary py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Uma pequena manutenção pode virar
            <br className="hidden sm:block" />
            um grande prejuízo.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            A maioria dos problemas graves começa com um sinal pequeno. Detectar cedo
            é a diferença entre uma manutenção barata e um comprometimento geral.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl items-start gap-4 sm:grid-cols-4 sm:gap-3">
          {steps.map((step, i) => (
            <div key={step.title} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${step.border} ${step.bg} ${step.color}`}
                >
                  {step.icon}
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-muted sm:block" />
                )}
              </div>
              <div className="sm:mt-4">
                <p className="text-sm font-semibold text-primary">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
