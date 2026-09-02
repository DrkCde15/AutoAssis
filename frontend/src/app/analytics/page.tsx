import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart3,
  Eye,
  Shield,
  Settings,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics e Cookies",
  description:
    "Saiba como o AutoAssist coleta e usa dados de analytics de forma transparente e conforme a LGPD.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/analytics",
  },
};

const collected = [
  "Páginas visitadas e tempo na página",
  "Dispositivo (desktop, mobile, tablet)",
  "Navegador e sistema operacional",
  "Origem da visita (referral, busca orgânica)",
  "Ações de clique em botões principais",
  "Erros de carregamento de páginas",
];

const notCollected = [
  "Conteúdo de chats com a NOG IA",
  "Fotos ou imagens enviadas",
  "Dados de veículos (placa, chassi, RENAVAM)",
  "Senhas, tokens ou chaves de API",
  "CPF, telefone ou endereço",
  "E-mail (apenas via cadastro, não via analytics)",
  "Localização precisa do usuário",
  "Dados de pagamento",
];

const purposes = [
  "Melhorar a experiência do usuário",
  "Identificar páginas com problemas de performance",
  "Entender quais funcionalidades são mais usadas",
  "Otimizar caminhos de navegação e conversão",
  "Detectar e corrigir bugs mais rapidamente",
  "Tomar decisões de produto baseadas em dados reais",
];

export default function AnalyticsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="section pt-28">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Legal</span>
              <h1 className="section__title">Analytics e Cookies</h1>
              <p className="section__desc">
                Transparência total sobre como coletamos e usamos dados de
                analytics.
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardBody>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft">
                        <Eye size={18} className="text-accent" />
                      </div>
                      <h2 className="text-base font-semibold text-primary">
                        O que é coletado
                      </h2>
                    </div>
                    <ul className="space-y-2.5">
                      {collected.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-secondary"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
                        <Shield size={18} className="text-danger" />
                      </div>
                      <h2 className="text-base font-semibold text-primary">
                        O que não entra no analytics
                      </h2>
                    </div>
                    <ul className="space-y-2.5">
                      {notCollected.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-secondary"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                        <BarChart3 size={18} className="text-success" />
                      </div>
                      <h2 className="text-base font-semibold text-primary">
                        Como usamos esses eventos
                      </h2>
                    </div>
                    <ul className="space-y-2.5">
                      {purposes.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-secondary"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                        <Settings size={18} className="text-warning" />
                      </div>
                      <h2 className="text-base font-semibold text-primary">
                        Preferência de analytics
                      </h2>
                    </div>
                    <div className="space-y-4 text-sm text-secondary">
                      <p>
                        O analytics do AutoAssist é{" "}
                        <Badge variant="accent">opt-in</Badge>. Você pode
                        ativar ou desativar a coleta a qualquer momento nas
                        configurações da sua conta.
                      </p>
                      <p>
                        Quando desativado, nenhum evento é enviado ao nosso
                        servidor. Dados já coletados antes da desativação são
                        mantidos por 90 dias e depois excluídos permanentemente.
                      </p>
                      <p>
                        Utilizamos cookies estritamente necessários para
                        autenticação e preferências. Não utilizamos cookies de
                        terceiros para rastreamento.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
