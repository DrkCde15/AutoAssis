"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BookOpen,
  Play,
  ExternalLink,
  Loader2,
  Crown,
  MessageCircle,
  Search,
  Wrench,
  Car,
  Cpu,
  Zap,
} from "lucide-react";

interface LibraryItem {
  id: string;
  type: "video" | "link";
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  topic: string;
}

interface TopicSection {
  topic: string;
  items: LibraryItem[];
}

const TOPIC_ICONS: Record<string, any> = {
  motor: Wrench,
  eletrica: Zap,
  suspensao: Car,
  freios: AlertTriangle,
  oleo: Droplets,
  pneus: Circle,
  geral: BookOpen,
};

import { AlertTriangle, Droplets, Circle } from "lucide-react";

export default function LibraryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [sections, setSections] = useState<TopicSection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        setIsPremium(currentUser.is_premium ?? false);

        if (!currentUser.is_premium) {
          setLoading(false);
          return;
        }

        const response = await authFetch("/api/videos/library");
        if (response.ok) {
          const data = await response.json();
          const lib = data.library ?? [];
          const mapped: TopicSection[] = lib.map((section: any) => ({
            topic: section.topic ?? "",
            items: [
              ...(section.videos ?? []).map((v: any) => ({
                id: String(v.url ?? Math.random()),
                type: "video" as const,
                title: v.title ?? v.nome ?? "",
                description: v.description ?? v.descricao ?? "",
                url: v.url ?? "",
                thumbnail: v.thumbnail ?? v.thumb ?? "",
                topic: section.topic ?? "",
              })),
              ...(section.links ?? []).map((l: any) => ({
                id: String(l.url ?? Math.random()),
                type: "link" as const,
                title: l.title ?? l.nome ?? "",
                description: l.description ?? l.descricao ?? "",
                url: l.url ?? "",
                thumbnail: l.thumbnail ?? l.thumb ?? "",
                topic: section.topic ?? "",
              })),
            ],
          }));
          setSections(mapped);
        }
      } catch (error) {
        console.error("Failed to load library:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 bg-secondary border-border">
          <Crown className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">Recurso Premium</h1>
          <p className="text-secondary mb-6">
            Assine o plano premium para acessar a biblioteca automotiva completa com vídeos e materiais exclusivos.
          </p>
          <Button className="w-full" onClick={() => router.push("/perfil")}>
            <Crown className="w-4 h-4 mr-2" />
            Ver Planos
          </Button>
        </Card>
      </div>
    );
  }

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((section) => section.items.length > 0);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Minha Biblioteca Automotiva</h1>
          <p className="text-secondary mt-2">
            {totalItems} materiais disponíveis para aprendizado
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar na biblioteca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {filteredSections.length === 0 ? (
          <Card className="p-12 text-center bg-secondary border-border">
            <BookOpen className="w-16 h-16 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">
              {searchQuery ? "Nenhum resultado encontrado" : "Biblioteca vazia"}
            </h2>
            <p className="text-secondary mb-6 max-w-md mx-auto">
              {searchQuery
                ? "Tente buscar com outros termos"
                : "Pergunte ao NOG sobre tópicos automotivos para construir sua biblioteca personalizada."}
            </p>
            <Link href="/chat">
              <Button>
                <MessageCircle className="w-4 h-4 mr-2" />
                Conversar com o NOG
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-10">
            {filteredSections.map((section) => {
              const Icon = TOPIC_ICONS[section.topic] ?? BookOpen;

              return (
                <section key={section.topic}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <h2 className="text-xl font-semibold text-primary capitalize">
                      {section.topic.replace(/_/g, " ")}
                    </h2>
                    <Badge variant="default" className="ml-2">
                      {section.items.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map((item) => (
                      <Card
                        key={item.id}
                        className="bg-secondary border-border overflow-hidden hover:border-accent transition-colors"
                      >
                        {item.type === "video" ? (
                          <div className="relative">
                            {item.thumbnail ? (
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-40 object-cover"
                              />
                            ) : (
                              <div className="w-full h-40 bg-primary flex items-center justify-center">
                                <Play className="w-12 h-12 text-muted" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                                <Play className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-primary flex items-center justify-center">
                            <ExternalLink className="w-8 h-8 text-muted" />
                          </div>
                        )}

                        <div className="p-4">
                          <h3 className="font-medium text-primary line-clamp-2 mb-1">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-secondary line-clamp-2 mb-3">
                              {item.description}
                            </p>
                          )}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm" className="w-full">
                              {item.type === "video" ? (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Assistir
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Abrir link
                                </>
                              )}
                            </Button>
                          </a>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
