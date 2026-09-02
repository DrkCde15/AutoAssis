import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Politica de Privacidade",
  description:
    "Politica de privacidade da plataforma AutoAssist. Saiba como seus dados sao tratados.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/privacidade",
  },
};

export default function PrivacidadePage() {
  return (
    <>
      <Navbar />
      <main className="section pt-28">
      <div className="section__wrap max-w-3xl mx-auto">
        <span className="section__tag">Legal</span>
        <h1 className="text-4xl font-bold tracking-tight mb-8">Política de Privacidade</h1>
        <p className="text-sm text-muted mb-8">Última atualização: janeiro de 2026</p>

        <div className="space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">1. Dados tratados</h2>
            <p>Coletamos dados de conta (nome, e-mail), dados de veículos, mensagens e imagens enviadas à NOG, dados técnicos de segurança e eventos de analytics (com consentimento).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">2. Finalidades</h2>
            <p>Seus dados são utilizados para: gerenciamento de conta, diagnósticos via IA, histórico de manutenção, alertas preventivos, processamento de pagamentos, melhoria do serviço, prevenção de abuso e conformidade legal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">3. Bases legais</h2>
            <p>O tratamento é baseado em: execução de contrato, consentimento, obrigação legal, legítimo interesse e exercício regular de direitos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">4. Compartilhamento</h2>
            <p>Seus dados podem ser compartilhados com: serviços de hospedagem, banco de dados, e-mail transacional, processamento de pagamento, autenticação, serviços de IA, APIs automotivas, provedores de vídeo e ferramentas de segurança.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">5. Analytics e cookies</h2>
            <p>Utilizamos analytics próprio e minimizado, apenas após consentimento. Não coletamos conteúdo de chat, senhas, fotos, placas ou tokens via analytics.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">6. Retenção e exclusão</h2>
            <p>Os dados são retidos pelo tempo necessário. Você pode solicitar exclusão ou correção a qualquer momento.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">7. Direitos dos titulares</h2>
            <p>Conforme a LGPD, você tem direito a: confirmação, acesso, correção, anonimização, bloqueio, exclusão, portabilidade, informações sobre compartilhamento e revisão de decisões automatizadas.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">8. Referências oficiais</h2>
            <p>Para mais informações, consulte o site da ANPD (Autoridade Nacional de Proteção de Dados).</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    </>
  );
}
