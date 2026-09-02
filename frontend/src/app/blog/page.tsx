import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getAllPosts } from "@/lib/blog";
import { Calendar, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Artigos sobre manutencao automotiva, duvidas sobre carros e dicas da NOG IA.",
  alternates: {
    canonical: "https://autoassist-l9lr.onrender.com/blog",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Navbar />
      <main className="section pt-28">
      <div className="section__wrap">
        <div className="section__header">
          <span className="section__tag">Blog</span>
          <h1 className="section__title">Dúvidas do carro</h1>
          <p className="section__desc">
            Artigos sobre manutenção, dúvidas e dicas para entender melhor o seu veículo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-border bg-secondary p-6 transition-all duration-200 hover:border-border-hover hover:-translate-y-1"
            >
              <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent mb-4">
                {post.category}
              </span>
              <h2 className="text-lg font-semibold text-primary mb-2 group-hover:text-accent transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-secondary mb-4 line-clamp-2">
                {post.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Calendar size={14} />
                  {new Date(post.publishedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Ler <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
    <Footer />
    </>
  );
}
