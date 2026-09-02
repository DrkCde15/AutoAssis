import { Bot, TableProperties, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const products = [
  {
    icon: <Bot className="h-6 w-6" />,
    title: 'NOG IA',
    subtitle: 'Diagnóstico por conversa',
    description:
      'Converse com a inteligência artificial sobre o problema do seu carro. Receba hipóteses, nível de risco e orientações em segundos.',
    color: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    href: '/chat',
  },
  {
    icon: <TableProperties className="h-6 w-6" />,
    title: 'Tabela FIPE',
    subtitle: 'Valor do seu carro',
    description:
      'Consulte o valor de mercado do seu veículo em tempo real, com base na tabela FIPE mais atualizada.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    href: '/fipe',
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: 'Laudo de Revenda',
    subtitle: 'PDF profissional',
    description:
      'Gere um laudo técnico completo em PDF para embasar a venda do seu veículo com credibilidade.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    href: '/laudo',
  },
]

export default function ProductShowcase() {
  return (
    <section className="relative bg-secondary py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Veja o AutoAssist em ação.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            Ferramentas reais para quem quer entender e cuidar do carro com
            inteligência.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.title}
              className={`group relative rounded-2xl border ${p.border} bg-secondary p-6 transition-all hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className={`mb-4 inline-flex rounded-xl p-3 ${p.bg} ${p.color}`}>
                {p.icon}
              </div>
              <h3 className="text-lg font-semibold text-primary">{p.title}</h3>
              <p className="mt-1 text-sm font-medium text-muted">{p.subtitle}</p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {p.description}
              </p>
              <Link
                href={p.href}
                className={`mt-4 inline-flex items-center gap-1.5 text-sm font-medium ${p.color} transition-colors hover:underline`}
              >
                Explorar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
