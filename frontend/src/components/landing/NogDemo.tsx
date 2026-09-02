import { Mic, Camera, Type, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function NogDemo() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="mb-3 inline-block rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              NOG IA
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Diagnóstico que cabe no seu bolso.
            </h2>
            <p className="mt-4 text-lg text-secondary">
              Descreva o problema, envie uma foto ou grave o som. O NOG analisa e
              retorna hipóteses com nível de risco, sem precisar de especialista.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <InputCard
                icon={<Mic className="h-5 w-5 text-red-400" />}
                label="Áudio"
                description="Grave o som do problema"
                color="red"
              />
              <InputCard
                icon={<Camera className="h-5 w-5 text-emerald-400" />}
                label="Foto"
                description="Tire uma foto do componente"
                color="emerald"
              />
              <InputCard
                icon={<Type className="h-5 w-5 text-blue-400" />}
                label="Texto"
                description="Descreva o que está sentindo"
                color="blue"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-secondary p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
              <div className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-sm font-medium text-primary">
                AutoAssist · NOG IA
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent/10 px-4 py-3 text-sm text-primary">
                  Meu carro começou a fazer um barulho metálico quando acelero.
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[85%] space-y-3 rounded-2xl rounded-bl-md bg-secondary px-4 py-4 text-sm">
                  <p className="text-secondary">
                    Com base na descrição, identifiquei as possíveis causas:
                  </p>

                  <div className="space-y-2">
                    <CauseItem
                      text="Correia / Tensor"
                      level="Alto"
                      color="red"
                    />
                    <CauseItem
                      text="Rolamento de acessórios"
                      level="Médio"
                      color="yellow"
                    />
                    <CauseItem
                      text="Escapamento solto"
                      level="Médio"
                      color="yellow"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400">
                      Risco moderado
                    </span>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-xs text-emerald-300">
                      Recomendação: Leve a um mecânico nas próximas 48h. Evite
                      acelerações bruscas até o diagnóstico presencial.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function InputCard({
  icon,
  label,
  description,
  color,
}: {
  icon: React.ReactNode
  label: string
  description: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    red: 'border-red-500/20 bg-red-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
  }

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 ${colorMap[color]}`}
    >
      {icon}
      <div>
        <p className="text-sm font-medium text-primary">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  )
}

function CauseItem({
  text,
  level,
  color,
}: {
  text: string
  level: string
  color: string
}) {
  const dotColor: Record<string, string> = {
    red: 'bg-red-400',
    yellow: 'bg-yellow-400',
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-primary/50 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dotColor[color]}`} />
        <span className="text-xs text-primary">{text}</span>
      </div>
      <span className="text-xs text-muted">{level}</span>
    </div>
  )
}
