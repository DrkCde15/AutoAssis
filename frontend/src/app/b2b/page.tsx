import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { B2BForm } from "@/components/B2BForm";
import {
  Terminal,
  Key,
  Image,
  FileText,
  BarChart3,
  Shield,
  Building2,
  BookOpen,
  ArrowRight,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AutoAssist para Empresas",
  description:
    "Diagnóstico automotivo por foto via API. Integre o AutoAssist ao seu sistema com nossa API B2B.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/b2b",
  },
};

const steps = [
  {
    icon: Key,
    title: "Crie sua API Key",
    description: "Cadastre-se e gere suas credenciais de acesso à API.",
  },
  {
    icon: Image,
    title: "Envie a imagem",
    description:
      "Faça POST de uma foto do painel ou componente para nosso endpoint.",
  },
  {
    icon: FileText,
    title: "Receba o relatório",
    description:
      "Receba um diagnóstico estruturado em JSON com causas, severidade e sugestões.",
  },
  {
    icon: BarChart3,
    title: "Acompanhe o uso",
    description: "Monitore suas chamadas no painel de controle em tempo real.",
  },
];

const endpoints = [
  { method: "POST", path: "/api/b2b/diagnosis", desc: "Diagnóstico por imagem" },
  { method: "POST", path: "/api/b2b/checkout", desc: "Criar sessão de pagamento" },
  { method: "GET", path: "/api/b2b/leads", desc: "Listar leads capturados" },
  { method: "GET", path: "/api/b2b/usage", desc: "Consultar uso da API" },
];

export default function B2BPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="section pt-28">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">API B2B</span>
              <h1 className="section__title">
                Diagnóstico automotivo por foto, via API
              </h1>
              <p className="section__desc">
                Integre o AutoAssist ao seu sistema. Envie uma imagem e receba
                um diagnóstico completo em segundos.
              </p>
            </div>

            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-secondary">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Terminal size={16} className="text-accent" />
                <span className="text-xs font-medium text-muted">
                  Exemplo de chamada
                </span>
              </div>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed">
                <code className="text-secondary">
                  <span className="text-accent">curl</span>{" "}
                  <span className="text-success">-X POST</span>{" "}
                  https://api.autoassist-l9lr.onrender.com/api/b2b/diagnosis \
                  {"\n"}{"  "}-H{" "}
                  <span className="text-warning">
                    &quot;Authorization: Bearer sk_live_xxx&quot;
                  </span>{" "}
                  \
                  {"\n"}{"  "}-F{" "}
                  <span className="text-warning">&quot;image=@painel.jpg&quot;</span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        <section className="section section--alt">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Como funciona</span>
              <h2 className="section__title">4 passos para começar</h2>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <Card key={step.title} className="text-center">
                  <CardBody>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
                      <step.icon size={20} className="text-accent" />
                    </div>
                    <Badge variant="default" className="mb-3">
                      {String(i + 1).padStart(2, "0")}
                    </Badge>
                    <h3 className="text-base font-semibold text-primary mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-secondary">
                      {step.description}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__wrap">
            <B2BForm />
          </div>
        </section>

        <section className="section section--alt">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Segurança</span>
              <h2 className="section__title">Segurança e conformidade</h2>
              <p className="section__desc">
                Seus dados e os dados dos seus clientes estão protegidos.
              </p>
            </div>

            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Criptografia",
                  description:
                    "Todos os dados são criptografados em trânsito (TLS 1.3) e em repouso (AES-256).",
                },
                {
                  icon: Shield,
                  title: "LGPD",
                  description:
                    "Conformidade total com a Lei Geral de Proteção de Dados. Dados nunca são compartilhados.",
                },
                {
                  icon: Shield,
                  title: "Rate Limiting",
                  description:
                    "Proteção contra abuso com rate limiting inteligente por chave de API.",
                },
              ].map((item) => (
                <Card key={item.title} className="text-center">
                  <CardBody>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                      <item.icon size={20} className="text-success" />
                    </div>
                    <h3 className="text-base font-semibold text-primary mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-secondary">
                      {item.description}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__wrap">
            <Card variant="featured" className="mx-auto max-w-3xl">
              <CardBody>
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                  <Building2
                    size={32}
                    className="shrink-0 text-accent"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary">
                      Enterprise
                    </h3>
                    <p className="text-sm text-secondary">
                      Mais de 20.000 chamadas/mês? Temos planos sob medida para
                      sua empresa com SLA dedicado e suporte técnico
                      prioritário.
                    </p>
                  </div>
                  <Link href="#contato">
                    <Button variant="secondary" size="sm">
                      Falar com vendas
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>

        <section className="section section--alt">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Documentação</span>
              <h2 className="section__title">Documentação da API</h2>
              <p className="section__desc">
                Consulte os endpoints, parâmetros e exemplos de integração.
              </p>
            </div>

            <div className="mx-auto max-w-3xl">
              <Card>
                <CardBody>
                  <div className="space-y-3">
                    {endpoints.map((ep) => (
                      <div
                        key={ep.path}
                        className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-border-hover"
                      >
                        <Badge
                          variant={
                            ep.method === "POST" ? "accent" : "success"
                          }
                        >
                          {ep.method}
                        </Badge>
                        <code className="flex-1 text-sm text-primary">
                          {ep.path}
                        </code>
                        <span className="text-sm text-muted hidden sm:block">
                          {ep.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <Link href="/docs">
                      <Button variant="secondary" size="sm">
                        <BookOpen size={16} />
                        Ver documentação
                      </Button>
                    </Link>
                    <Link href="/api/swagger-ui">
                      <Button variant="ghost" size="sm">
                        Swagger UI
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </section>

        <section className="section" id="contato">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Contato</span>
              <h2 className="section__title">Fale conosco</h2>
              <p className="section__desc">
                Preencha o formulário e entraremos em contato em até 24 horas.
              </p>
            </div>

            <Card className="mx-auto max-w-xl">
              <CardBody>
                <form className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-secondary">
                        Nome
                      </label>
                      <input
                        type="text"
                        placeholder="Seu nome"
                        className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-secondary">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-secondary">
                        Empresa
                      </label>
                      <input
                        type="text"
                        placeholder="Nome da empresa"
                        className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-secondary">
                        Telefone
                      </label>
                      <input
                        type="tel"
                        placeholder="(11) 99999-9999"
                        className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-secondary">
                      Mensagem
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Como podemos ajudar?"
                      className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                  </div>
                  <Button variant="primary" className="w-full">
                    Enviar mensagem
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
