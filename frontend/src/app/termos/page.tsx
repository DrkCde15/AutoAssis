import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de uso da plataforma AutoAssist. Leia os termos e condições de uso do serviço.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/termos",
  },
};

export default function TermosPage() {
  return (
    <>
      <Navbar />
      <main className="section pt-28">
      <div className="section__wrap max-w-3xl mx-auto">
        <span className="section__tag">Legal</span>
        <h1 className="text-4xl font-bold tracking-tight mb-8">Termos de Uso</h1>
        <p className="text-sm text-muted mb-8">Última atualização: janeiro de 2026</p>

        <div className="space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">1. Aceite e escopo</h2>
            <p>Ao acessar ou usar o AutoAssist, você concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize o serviço.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">2. Natureza das informações</h2>
            <p>As orientações fornecidas pela NOG (inteligência artificial) e pelo AutoAssist são de caráter informativo e não substituem diagnósticos profissionais, inspeções presenciais ou laudos técnicos de mecânicos habilitados.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">3. Responsabilidades do usuário</h2>
            <p>Você é responsável por fornecer informações truthful sobre seu veículo e sintomas. Não utilize o serviço para fins ilegais. Para questões de segurança, sempre procure avaliação profissional.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">4. IA, imagens e limitações</h2>
            <p>As respostas da IA podem conter imprecisões. Valide sempre antes de tomar decisões de reparo ou compra. O AutoAssist não se responsabiliza por decisões tomadas com base nas orientações da NOG.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">5. Planos, pagamentos e acesso</h2>
            <p>O plano gratuito oferece funcionalidades limitadas. O Premium (R$ 19,90/mês) desbloqueia todas as funcionalidades. Pagamentos processados via Cakto. Cancelamento a qualquer momento sem multa.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">6. Propriedade intelectual</h2>
            <p>A marca, código, design e conteúdo do AutoAssist são de propriedade dos seus criadores. Você recebe uma licença limitada e não exclusiva para uso pessoal do serviço.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">7. Suspensão e encerramento</h2>
            <p>O acesso pode ser suspenso por violações dos termos, uso abusivo, fraude, inadimplência ou ordem judicial.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary mb-3">8. Contato</h2>
            <p>Em caso de dúvidas, entre em contato pelo canal de suporte disponível na plataforma.</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
    </>
  );
}
