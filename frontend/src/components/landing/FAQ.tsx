import { AccordionItem } from '@/components/ui/Accordion'

const faqs = [
  {
    question: 'O que é o NOG IA?',
    answer:
      'o NOG é uma inteligência artificial especializada em diagnóstico automotivo. Ela analisa descrições de problemas, fotos e áudios para identificar possíveis causas e orientar o próximo passo.',
  },
  {
    question: 'o NOG substitui o mecânico?',
    answer:
      'Não. o NOG é uma ferramenta de apoio que fornece hipóteses e orientações. O diagnóstico definitivo e o reparo devem ser realizados por um profissional qualificado.',
  },
  {
    question: 'Posso enviar fotos do meu carro?',
    answer:
      'Sim. Você pode enviar fotos de peças, painéis, vazamentos ou qualquer componente. o NOG analisa a imagem e retorna hipóteses com base no visual.',
  },
  {
    question: 'O áudio funciona como?',
    answer:
      'Você grava o som do problema (rangido, batida, motor) e o NOG analisa o padrão acústico para identificar a causa mais provável.',
  },
  {
    question: 'Qual a diferença entre Gratuito e Premium?',
    answer:
      'No plano gratuito, você tem acesso limitado à NOG, FIPE e 1 veículo. No Premium, a NOG é ilimitada, você pode cadastrar veículos ilimitados, gerar laudos PDF e receber alertas de manutenção.',
  },
  {
    question: 'A consulta FIPE é atualizada?',
    answer:
      'Sim. A tabela FIPE é atualizada mensalmente e o AutoAssist reflete os valores mais recentes disponíveis no mercado.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'Sim. Todos os dados são criptografados e armazenados com segurança. Nunca compartilhamos suas informações com terceiros. O AutoAssist é totalmente conforme à LGPD.',
  },
  {
    question: 'Posso cancelar o Premium a qualquer momento?',
    answer:
      'Sim. Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento e continuar usando até o final do período já pago.',
  },
  {
    question: 'O AutoAssist funciona para qualquer carro?',
    answer:
      'Sim. A NOG funciona com qualquer marca, modelo ou ano. Quanto mais detalhes você fornecer, mais preciso será o diagnóstico.',
  },
]

export default function FAQ() {
  return (
    <section className="relative bg-secondary py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-border bg-secondary px-5">
              <AccordionItem
                question={faq.question}
                answer={faq.answer}
                defaultOpen={i === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
