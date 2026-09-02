import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import {
  MessageCircle,
  UserPlus,
  Car,
  Gauge,
  Thermometer,
  Fuel,
  Wrench,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Central de Dúvidas do Carro",
  description:
    "Dúvidas comuns sobre carros, manutenção e diagnóstico. Respostas rápidas da NOG IA.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/duvidas",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Central de Dúvidas do Carro",
  description:
    "Dúvidas comuns sobre carros, manutenção e diagnóstico. Respostas rápidas da NOG IA.",
  url: "https://autoassist-l9lr.onrender.com/duvidas",
};

const articles = [
  {
    slug: "luz-painel",
    title: "O que significa cada luz do painel do carro",
    description:
      "Guia completo das luzes de aviso do painel: vermelha, amarela e o que cada uma indica sobre a saúde do seu veículo.",
    icon: AlertTriangle,
    category: "Segurança",
    featured: true,
  },
  {
    slug: "oleo-motor",
    title: "Como saber quando trocar o óleo do motor",
    description:
      "Intervalos, sinais de desgaste e como a NOG IA pode ajudar a monitorar a vida útil do óleo.",
    icon: Gauge,
    category: "Manutenção",
  },
  {
    slug: "freios",
    title: "Sinais de que seus freios precisam de atenção",
    description:
      "Ruídos, vibrações e desgaste: aprenda a identificar quando os freios precisam de manutenção.",
    icon: Wrench,
    category: "Segurança",
  },
  {
    slug: "temperatura",
    title: "Motor aquecendo: o que fazer e o que pode ser",
    description:
      "Overheating é emergência. Saiba as causas mais comuns e como agir antes de danos maiores.",
    icon: Thermometer,
    category: "Emergência",
  },
  {
    slug: "combustivel",
    title: "Gasolina, etanol ou flex: qual compensa mais",
    description:
      "Comparativo de custo-benefício, desempenho e quando usar cada tipo de combustível.",
    icon: Fuel,
    category: "Economia",
  },
  {
    slug: "pneus",
    title: "Desgaste de pneus: como identificar e quando trocar",
    description:
      "Calibragem, rodízio e sinais visuais de que é hora de trocar seus pneus.",
    icon: Car,
    category: "Manutenção",
  },
  {
    slug: "bateria",
    title: "Bateria do carro: durée, sinais de fraco e como trocar",
    description:
      "Vida útil, testes simples e como evitar ficar na mão com bateria descarregada.",
    icon: Lightbulb,
    category: "Manutenção",
  },
  {
    slug: "cambio",
    title: "Câmbio automático: manutenção preventiva",
    description:
      "Fluido, troca de óleo e hábitos que prolongam a vida útil do câmbio automático.",
    icon: Wrench,
    category: "Manutenção",
  },
  {
    slug: "ruido-suspensao",
    title: "Ruídos na suspensão: o que significam",
    description:
      "Estalos, rangidos e batidas: identifique o problema antes que fique caro.",
    icon: AlertTriangle,
    category: "Diagnóstico",
  },
];

export default function DuvidasPage() {
  const featured = articles.find((a) => a.featured);
  const regular = articles.filter((a) => !a.featured);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <section className="section pt-28">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Central de Dúvidas</span>
              <h1 className="section__title">
                Dúvidas comuns do carro, respondidas na hora
              </h1>
              <p className="section__desc">
                Artigos sobre manutenção, diagnóstico e cuidados para entender
                melhor o seu veículo.
              </p>
            </div>

            {featured && (
              <Link href={`/blog/${featured.slug}`} className="block mb-8">
                <div className="group rounded-2xl border border-border bg-secondary p-8 transition-all duration-200 hover:border-accent hover:-translate-y-1">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
                      <featured.icon size={28} className="text-accent" />
                    </div>
                    <div className="flex-1">
                      <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent mb-3">
                        {featured.category}
                      </span>
                      <h2 className="text-xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">
                        {featured.title}
                      </h2>
                      <p className="text-sm text-secondary">
                        {featured.description}
                      </p>
                    </div>
                    <ArrowRight
                      size={20}
                      className="shrink-0 text-muted transition-all group-hover:text-accent group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {regular.map((article) => (
                <Link
                  key={article.slug}
                  href={`/blog/${article.slug}`}
                  className="group rounded-2xl border border-border bg-secondary p-6 transition-all duration-200 hover:border-border-hover hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <article.icon
                        size={18}
                        className="text-muted group-hover:text-accent transition-colors"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent mb-3">
                        {article.category}
                      </span>
                      <h2 className="text-base font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-sm text-secondary line-clamp-2">
                        {article.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-16 text-center">
              <div className="mx-auto max-w-md rounded-2xl border border-border bg-secondary p-8">
                <h2 className="text-lg font-bold text-primary mb-2">
                  Prefere perguntar direto?
                </h2>
                <p className="text-sm text-secondary mb-6">
                  Converse com a NOG IA ou crie sua conta para diagnósticos
                  personalizados.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link href="/chat">
                    <Button variant="primary">
                      <MessageCircle size={16} />
                      Abrir chat
                    </Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button variant="secondary">
                      <UserPlus size={16} />
                      Criar conta
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
