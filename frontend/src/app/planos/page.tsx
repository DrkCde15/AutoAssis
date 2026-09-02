import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";
import { Shield, Check, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Planos e Preços",
  description:
    "Escolha o plano ideal do AutoAssist para cuidar do seu carro com diagnóstico por IA, tabela FIPE e muito mais.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/planos",
  },
};

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "/ sempre",
    features: [
      "NOG limitada",
      "Tabela FIPE",
      "1 veículo",
      "30 consultas/mês",
    ],
    cta: "Começar grátis",
    href: "/cadastro",
    variant: "secondary" as const,
    popular: false,
  },
  {
    name: "Premium",
    price: "R$ 19,90",
    period: "/ mês",
    features: [
      "NOG ilimitada",
      "Veículos ilimitados",
      "Laudo PDF",
      "Alertas de manutenção",
      "Suporte prioritário",
      "30 consultas/mês",
    ],
    cta: "Assinar Premium",
    href: "/cadastro?plan=premium",
    variant: "primary" as const,
    popular: true,
  },
];

const faqItems = [
  {
    question: "O plano Free tem limite de consultas?",
    answer:
      "Sim. O plano gratuito oferece 30 consultas por mês com a NOG IA. Quando atingir o limite, precisará aguardar o próximo mês ou upgrade para o Premium.",
  },
  {
    question: "Como funciona a assinatura do Premium?",
    answer:
      "O Premium custa R$ 19,90/mês, processado via Cakto. Você pode cancelar a qualquer momento sem multa. O acesso é liberado imediatamente após o pagamento.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Utilizamos criptografia em trânsito e em repouso, autenticação segura e seguimos rigorosamente a LGPD. Seus dados nunca são compartilhados com terceiros sem consentimento.",
  },
  {
    question: "Tem garantia?",
    answer:
      "Sim. Oferecemos 7 dias de garantia. Se não ficar satisfeito com o Premium dentro desse período, devolvemos 100% do valor pago.",
  },
];

export default function PlanosPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="section pt-28">
          <div className="section__wrap">
            <div className="section__header mx-auto max-w-2xl">
              <span className="section__tag">Planos e Preços</span>
              <h1 className="section__title">
                Cuide do seu carro por muito menos do que custa uma oficina
              </h1>
              <p className="section__desc">
                Escolha o plano ideal para você. Comece grátis e faça upgrade
                quando quiser.
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  variant={plan.popular ? "featured" : "default"}
                  className="relative"
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="accent">Mais popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="pt-4">
                      <h3 className="text-lg font-semibold text-primary">
                        {plan.name}
                      </h3>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-primary">
                          {plan.price}
                        </span>
                        <span className="text-sm text-muted">
                          {plan.period}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2.5 text-sm text-secondary"
                        >
                          <Check
                            size={16}
                            className="shrink-0 text-success"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <Link href={plan.href}>
                        <Button
                          variant={plan.variant}
                          className="w-full"
                        >
                          {plan.popular && (
                            <Zap size={16} />
                          )}
                          {plan.cta}
                        </Button>
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <div className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border bg-secondary p-6">
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <Shield size={24} className="shrink-0 text-success" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    Dados protegidos e criptografados · Conforme a LGPD · 7
                    dias de garantia
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-16 max-w-3xl">
              <h2 className="mb-6 text-center text-2xl font-bold text-primary">
                Perguntas frequentes
              </h2>
              <Accordion>
                {faqItems.map((item) => (
                  <AccordionItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
