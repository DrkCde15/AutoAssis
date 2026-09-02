import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getPostBySlug, getAllSlugs } from "@/lib/blog";
import { Calendar, ArrowLeft, Tag } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
      url: `https://autoassist-l9lr.onrender.com/blog/${post.slug}`,
    },
    alternates: {
      canonical: `https://autoassist-l9lr.onrender.com/blog/${post.slug}`,
    },
  };
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-2xl font-bold text-primary mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
      if (match) {
        elements.push(
          <li key={key++} className="flex gap-2 mb-2">
            <span className="text-accent mt-1">•</span>
            <span>
              <strong className="text-primary">{match[1]}</strong>
              {match[2] ? `: ${match[2]}` : ""}
            </span>
          </li>
        );
      }
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="flex gap-2 mb-2">
          <span className="text-accent mt-1">•</span>
          <span>{line.slice(2)}</span>
        </li>
      );
    } else if (line.startsWith("> **")) {
      const text = line.replace(/^> /, "").replace(/\*\*/g, "");
      elements.push(
        <blockquote
          key={key++}
          className="border-l-4 border-accent pl-4 py-3 my-6 bg-accent-soft rounded-r-lg text-sm text-secondary"
        >
          {text}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="mb-4 leading-relaxed">
          {line}
        </p>
      );
    }
  }

  return elements;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "AutoAssist",
    },
    publisher: {
      "@type": "Organization",
      name: "AutoAssist",
      url: "https://autoassist-l9lr.onrender.com",
    },
    url: `https://autoassist-l9lr.onrender.com/blog/${post.slug}`,
  };

  return (
    <>
      <Navbar />
      <main className="section pt-28">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      <article className="section__wrap max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Voltar ao blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <Tag size={12} />
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar size={14} />
              {new Date(post.publishedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-secondary">{post.description}</p>
        </header>

        <div className="prose-custom text-secondary">
          {renderMarkdown(post.content)}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-secondary p-6 text-center">
          <h3 className="text-lg font-semibold text-primary mb-2">
            Conheça a NOG
          </h3>
          <p className="text-sm text-secondary mb-4">
            A NOG pode ajudar a diagnosticar o problema do seu carro com base nos sintomas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover"
            >
              Diagnosticar meu carro
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-secondary"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </article>
    </main>
    <Footer />
    </>
  );
}
