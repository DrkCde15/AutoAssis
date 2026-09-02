import { Mic, Camera, Keyboard } from 'lucide-react'

const features = [
  {
    icon: <Mic className="h-6 w-6" />,
    title: 'Áudio',
    description:
      'Grave o som do seu carro e a NOG identifica o componente provável com base no padrão acústico.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: <Camera className="h-6 w-6" />,
    title: 'Foto',
    description:
      'Tire uma foto de uma peça, painel ou vazamento. A NOG analisa a imagem e retorna hipóteses.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: <Keyboard className="h-6 w-6" />,
    title: 'Texto',
    description:
      'Descreva o que está sentindo em palavras simples. A NOG entende e te guia para o próximo passo.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
]

export default function Features() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Seu carro fala. O NOG entende.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-secondary">
            Escolha a melhor forma de descrever o problema: a inteligência artificial
            se adapta ao que você tem disponível.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border p-6 ${f.border} ${f.bg}`}
            >
              <div className={`mb-4 inline-flex rounded-lg bg-primary p-3 ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-primary">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
