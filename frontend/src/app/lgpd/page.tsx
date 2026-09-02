import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacidade e LGPD",
  description:
    "Informacoes sobre privacidade e conformidade com a LGPD na plataforma AutoAssist.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/lgpd",
  },
};

export default function LGPDPage() {
  return (
    <>
      <Navbar />
      <main className="section pt-28">
      <div className="section__wrap max-w-3xl mx-auto">
        <span className="section__tag">Legal</span>
        <h1 className="text-4xl font-bold tracking-tight mb-8">Privacidade e LGPD</h1>
        <p className="text-sm text-muted mb-8">Última atualização: janeiro de 2026</p>

        <div className="space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">1. Controlador e operador</h2>
            <p>O controlador decide o porquê e como os dados são tratados. Os operadores processam dados em nome do controlador.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">2. Direitos do titular</h2>
            <p>Conforme a LGPD, você tem direito a: confirmar o tratamento, acessar seus dados, corrigir dados incompletos, anonimizar, bloquear ou eliminar dados desnecessários, obter informações sobre compartilhamento, revogar consentimento e revisar decisões automatizadas.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">3. Dados automotivos e dados pessoais</h2>
            <p>Dados de veículo tornam-se pessoais quando vinculados a uma conta. Imagens, áudios, localização e placas requerem proteção especial.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">4. IA e decisões automatizadas</h2>
            <p>A IA do AutoAssist oferece suporte informativo. Recomendamos sempre validação humana para decisões de segurança, compra ou reparo.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">5. Consentimento e analytics</h2>
            <p>O analytics é opcional, documentado e revogável. Não coletamos conteúdo de chat, fotos, áudios, senhas, tokens, placas, CPF, telefone ou e-mail via analytics.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">6. Segurança e incidentes</h2>
            <p>Utilizamos autenticação, rate limiting, logs, criptografia em trânsito e revisão de acesso. Temos processo documentado para incidentes de segurança.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">7. Canal de atendimento</h2>
            <p>Disponibilizamos canal claro para solicitações de direitos LGPD.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">8. Fontes oficiais</h2>
            <p>Consulte o site da ANPD para mais informações sobre a Lei Geral de Proteção de Dados.</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    </>
  );
}
