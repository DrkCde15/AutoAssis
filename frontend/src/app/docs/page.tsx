import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Globe,
  FileJson,
  Key,
  ExternalLink,
  Copy,
  BookOpen,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentação da API",
  description:
    "Documentação completa da API do AutoAssist. Integre diagnóstico automotivo por IA ao seu sistema.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/docs",
  },
};

const authEndpoints = [
  {
    method: "POST",
    path: "/api/b2b/auth",
    desc: "Autenticar e obter token de acesso",
  },
];

const diagnosisParams = [
  { name: "image", type: "file", required: true, desc: "Imagem do painel ou componente (JPEG/PNG, max 10MB)" },
  { name: "vehicle_make", type: "string", required: false, desc: "Marca do veículo (ex: Toyota)" },
  { name: "vehicle_model", type: "string", required: false, desc: "Modelo do veículo (ex: Corolla)" },
  { name: "vehicle_year", type: "number", required: false, desc: "Ano do veículo (ex: 2020)" },
];

const planLimits = [
  { plan: "Starter", calls: "1.000/mês", price: "R$ 49,90/mês" },
  { plan: "Business", calls: "10.000/mês", price: "R$ 199,90/mês" },
  { plan: "Enterprise", calls: "20.000+/mês", price: "Sob consulta" },
];

const allEndpoints = [
  { method: "POST", path: "/api/b2b/diagnosis", desc: "Diagnóstico por imagem" },
  { method: "POST", path: "/api/b2b/checkout", desc: "Criar sessão de pagamento" },
  { method: "GET", path: "/api/b2b/leads", desc: "Listar leads capturados" },
  { method: "GET", path: "/api/b2b/usage", desc: "Consultar uso da API" },
];

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="section pt-28">
        <div className="section__wrap max-w-4xl mx-auto">
          <Link
            href="/b2b"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent mb-8"
          >
            <ArrowLeft size={16} />
            Voltar para API B2B
          </Link>

          <div className="section__header">
            <span className="section__tag">Documentação</span>
            <h1 className="section__title">Documentação da API</h1>
            <p className="section__desc">
              Tudo o que você precisa para integrar o AutoAssist ao seu sistema.
            </p>
          </div>

          <div className="mb-12 flex flex-wrap items-center gap-3">
            <Badge variant="accent">
              <Globe size={12} />
              Base URL: https://api.autoassist-l9lr.onrender.com
            </Badge>
            <Badge variant="default">
              <FileJson size={12} />
              Formato: JSON
            </Badge>
            <Badge variant="success">
              <Key size={12} />
              Auth: Bearer Token
            </Badge>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Autenticação
              </h2>
              <p className="mb-4 text-sm text-secondary">
                Todas as requisições devem incluir o header{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 text-accent">
                  Authorization: Bearer &lt;token&gt;
                </code>
                .
              </p>
              <Card>
                <CardBody>
                  {authEndpoints.map((ep) => (
                    <div
                      key={ep.path}
                      className="flex items-center gap-4 rounded-lg border border-border p-4"
                    >
                      <Badge variant="accent">{ep.method}</Badge>
                      <code className="flex-1 text-sm text-primary">
                        {ep.path}
                      </code>
                      <span className="text-sm text-muted hidden sm:block">
                        {ep.desc}
                      </span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Diagnóstico
              </h2>
              <p className="mb-4 text-sm text-secondary">
                Envie uma imagem e receba um diagnóstico estruturado com causas,
                severidade e sugestões.
              </p>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="accent">POST</Badge>
                    <code className="text-sm text-primary">
                      /api/b2b/diagnosis
                    </code>
                  </div>
                </CardHeader>
                <CardBody>
                  <h3 className="mb-3 text-sm font-semibold text-primary">
                    Parâmetros
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-3 font-semibold text-primary">
                            Nome
                          </th>
                          <th className="pb-3 font-semibold text-primary">
                            Tipo
                          </th>
                          <th className="pb-3 font-semibold text-primary">
                            Obrigatório
                          </th>
                          <th className="pb-3 font-semibold text-primary">
                            Descrição
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-secondary">
                        {diagnosisParams.map((param) => (
                          <tr key={param.name} className="border-b border-border/50">
                            <td className="py-3">
                              <code className="text-accent">{param.name}</code>
                            </td>
                            <td className="py-3">{param.type}</td>
                            <td className="py-3">
                              {param.required ? (
                                <Badge variant="danger">Sim</Badge>
                              ) : (
                                <Badge variant="default">Não</Badge>
                              )}
                            </td>
                            <td className="py-3">{param.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Checkout
              </h2>
              <p className="mb-4 text-sm text-secondary">
                Crie uma sessão de pagamento para seus clientes.
              </p>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <Badge variant="accent">POST</Badge>
                    <code className="flex-1 text-sm text-primary">
                      /api/b2b/checkout
                    </code>
                    <span className="text-sm text-muted hidden sm:block">
                      Criar sessão de pagamento
                    </span>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Leads
              </h2>
              <p className="mb-4 text-sm text-secondary">
                Liste os leads capturados pela sua integração.
              </p>
              <Card>
                <CardBody>
                  <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <Badge variant="success">GET</Badge>
                    <code className="flex-1 text-sm text-primary">
                      /api/b2b/leads
                    </code>
                    <span className="text-sm text-muted hidden sm:block">
                      Listar leads capturados
                    </span>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Limites do plano
              </h2>
              <Card>
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-3 font-semibold text-primary">
                            Plano
                          </th>
                          <th className="pb-3 font-semibold text-primary">
                            Chamadas
                          </th>
                          <th className="pb-3 font-semibold text-primary">
                            Preço
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-secondary">
                        {planLimits.map((plan) => (
                          <tr key={plan.plan} className="border-b border-border/50">
                            <td className="py-3 font-medium text-primary">
                              {plan.plan}
                            </td>
                            <td className="py-3">{plan.calls}</td>
                            <td className="py-3">{plan.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Exemplo completo (cURL)
              </h2>
              <Card>
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <span className="text-xs font-medium text-muted">
                    terminal
                  </span>
                  <button className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-accent cursor-pointer">
                    <Copy size={12} />
                    Copiar
                  </button>
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
                    {"\n"}{"  "}-H{" "}
                    <span className="text-warning">
                      &quot;Content-Type: multipart/form-data&quot;
                    </span>{" "}
                    \
                    {"\n"}{"  "}-F{" "}
                    <span className="text-warning">&quot;image=@painel.jpg&quot;</span>{" "}
                    \
                    {"\n"}{"  "}-F{" "}
                    <span className="text-warning">
                      &quot;vehicle_make=Toyota&quot;
                    </span>{" "}
                    \
                    {"\n"}{"  "}-F{" "}
                    <span className="text-warning">
                      &quot;vehicle_model=Corolla&quot;
                    </span>{" "}
                    \
                    {"\n"}{"  "}-F{" "}
                    <span className="text-warning">
                      &quot;vehicle_year=2020&quot;
                    </span>
                  </code>
                </pre>
              </Card>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                SDKs e exemplos
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <h3 className="text-base font-semibold text-primary">
                      Python
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <pre className="overflow-x-auto rounded-lg bg-primary p-4 text-sm">
                      <code className="text-secondary">
                        <span className="text-accent">import</span>{" "}
                        requests{"\n\n"}
                        response = requests.post{"\n"}
                        {"  "}{"\""}https://api.autoassist-l9lr.onrender.com/api/b2b/diagnosis{"\""},{"\n"}
                        {"  "}headers={"{"}{"\""}Authorization{"\""}:{"\""}Bearer sk_live_xxx{"\""}{"}"},{"\n"}
                        {"  "}files={"{"}{"\""}image{"\""}: open{"\""}painel.jpg{"\""},{"\""}rb{"\""}{"}"}{"}"}{"\n\n"}
                        data = response.json()
                      </code>
                    </pre>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-base font-semibold text-primary">
                      JavaScript
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <pre className="overflow-x-auto rounded-lg bg-primary p-4 text-sm">
                      <code className="text-secondary">
                        <span className="text-accent">const</span> form ={" "}
                        <span className="text-accent">new</span> FormData();{"\n"}
                        form.append{"("}{"\""}image{"\""}, file{")"};{"\n\n"}
                        <span className="text-accent">const</span> res ={" "}
                        <span className="text-accent">await</span> fetch{"("}{"\n"}
                        {"  "}{"\""}https://api.autoassist-l9lr.onrender.com/api/b2b/diagnosis{"\""},{"\n"}
                        {"  "}{"{"} method: {"\""}POST{"\""},{"\n"}
                        {"    "}headers: {"{"}{"\""}Authorization{"\""}: {"\""}Bearer sk_live_xxx{"\""}{"}"},{"\n"}
                        {"    "}body: form{"}"},{"\n"}{")"};
                        <span className="text-accent">const</span> data ={" "}
                        <span className="text-accent">await</span> res.json();
                      </code>
                    </pre>
                  </CardBody>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-bold text-primary">
                Links úteis
              </h2>
              <div className="flex flex-wrap gap-3">
                <Link href="/api/docs">
                  <Button variant="secondary" size="sm">
                    <BookOpen size={16} />
                    Documentação completa
                  </Button>
                </Link>
                <Link href="/api/swagger-ui">
                  <Button variant="secondary" size="sm">
                    <ExternalLink size={16} />
                    Swagger UI
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
