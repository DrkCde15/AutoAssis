"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Star, Send, Loader2, User } from "lucide-react";

interface Feedback {
  id: number;
  nome: string;
  estrelas: number;
  comentario: string;
  created_at: string;
}

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("/api/feedbacks", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estrelas: rating, nome: name, email, comentario: comment }),
      });
      if (res.ok) {
        setSubmitted(true);
        setRating(0);
        setName("");
        setEmail("");
        setComment("");
        fetchFeedbacks();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main>
        <section className="section pt-28">
          <div className="section__wrap">
            <div className="section__header">
              <span className="section__tag">Feedback</span>
              <h1 className="section__title">Deixe seu feedback</h1>
              <p className="section__desc">
                Sua opinião nos ajuda a construir um produto melhor para todos.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
              <Card>
                <CardBody>
                  <h2 className="text-lg font-semibold text-primary mb-6">
                    Enviar feedback
                  </h2>

                  {submitted ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                        <Star size={24} className="text-success" />
                      </div>
                      <h3 className="text-base font-semibold text-primary mb-2">
                        Obrigado pelo seu feedback!
                      </h3>
                      <p className="text-sm text-secondary mb-4">
                        Sua opinião é muito importante para nós.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSubmitted(false)}
                      >
                        Enviar outro
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-secondary">
                          Avaliação *
                        </label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRating(value)}
                              onMouseEnter={() => setHoverRating(value)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="cursor-pointer transition-transform hover:scale-110"
                            >
                              <Star
                                size={28}
                                className={
                                  value <= (hoverRating || rating)
                                    ? "fill-warning text-warning"
                                    : "text-muted"
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-secondary">
                          Nome (opcional)
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome"
                          className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-secondary">
                          Email (opcional)
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-secondary">
                          Comentário *
                        </label>
                        <textarea
                          rows={4}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Conte o que achou do AutoAssist..."
                          required
                          className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        disabled={submitting || !comment.trim() || rating === 0}
                      >
                        {submitting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        Enviar feedback
                      </Button>
                    </form>
                  )}
                </CardBody>
              </Card>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-primary">
                  Feedbacks recentes
                </h2>

                {loadingFeedbacks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-accent" />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-sm text-muted py-8">
                        Nenhum feedback ainda. Seja o primeiro!
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {feedbacks.map((fb) => (
                      <Card key={fb.id}>
                        <CardBody>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                <User
                                  size={14}
                                  className="text-muted"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-primary">
                                  {fb.nome || "Anônimo"}
                                </p>
                                <p className="text-xs text-muted">
                                  {new Date(
                                    fb.created_at
                                  ).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <Star
                                  key={v}
                                  size={14}
                                  className={
                                    v <= fb.estrelas
                                      ? "fill-warning text-warning"
                                      : "text-muted"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-secondary">
                            {fb.comentario}
                          </p>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
