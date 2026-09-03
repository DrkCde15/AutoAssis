"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Calendar, MapPin, RefreshCw, Loader2, Tag, Building2, ExternalLink, Clock } from "lucide-react";
import { authFetch } from "@/lib/auth-client";

interface Evento {
  id: number;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  cidade?: string;
  uf?: string;
  local?: string;
  categoria?: string;
  fonte_nome?: string;
  url?: string;
  passado?: boolean;
  status?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  feira: "Feira",
  encontro: "Encontro",
  competicao: "Competicao",
  exposicao: "Exposicao",
  congresso: "Congresso",
  outros: "Outros",
};

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatEventDate(event: Evento): string {
  const start = event.data_inicio ? new Date(event.data_inicio + "T12:00:00") : null;
  const end = event.data_fim ? new Date(event.data_fim + "T12:00:00") : null;

  if (!start || isNaN(start.getTime())) return "";

  const d = String(start.getDate()).padStart(2, "0");
  const m = MONTHS_PT[start.getMonth()];
  const y = String(start.getFullYear());
  let label = `${d} ${m} ${y}`;

  if (end && !isNaN(end.getTime()) && end.toDateString() !== start.toDateString()) {
    const d2 = String(end.getDate()).padStart(2, "0");
    const m2 = MONTHS_PT[end.getMonth()];
    const y2 = String(end.getFullYear());
    if (y === y2 && start.getMonth() === end.getMonth()) {
      label = `${d} a ${d2} ${m} ${y}`;
    } else if (y === y2) {
      label = `${d} ${m} a ${d2} ${m2} ${y}`;
    } else {
      label = `${d} ${m} ${y} a ${d2} ${m2} ${y2}`;
    }
  }

  return label;
}

function getStatus(event: Evento): { label: string; color: string } {
  const status = (event.status || "").toLowerCase();
  if (status === "cancelled") return { label: "Cancelado", color: "danger" };
  if (status === "ongoing") return { label: "Acontecendo", color: "success" };
  if (event.passado || status === "finished") return { label: "Encerrado", color: "default" };
  if (event.data_inicio) return { label: "Agendado", color: "accent" };
  return { label: "Data a confirmar", color: "warning" };
}

const ufs = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [ufFilter, setUfFilter] = useState("");

  const fetchEventos = async () => {
    setLoading(true);
    try {
      const params = ufFilter ? `?uf=${ufFilter}` : "";
      const res = await authFetch(`/api/events/automotive${params}`);
      if (res.ok) {
        const data = await res.json();
        const events = data.events || data || [];
        setEventos(Array.isArray(events) ? events : []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventos();
  }, [ufFilter]);

  return (
    <>
      <Navbar />
      <main>
        <section className="section pt-28">
          <div className="section__wrap">
            <div className="section__header mx-auto max-w-2xl">
              <span className="section__tag">Eventos Automotivos</span>
              <h1 className="section__title">
                Eventos Automotivos no Brasil
              </h1>
              <p className="section__desc">
                Confira os principais eventos do ramo automotivo: feiras,
                encontros, competicoes e lancamentos.
              </p>
            </div>

            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-secondary">
                {eventos.length} evento{eventos.length !== 1 ? "s" : ""}{" "}
                encontrado{eventos.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <Select
                    options={ufs.map((uf) => ({ value: uf, label: uf }))}
                    value={ufFilter}
                    onChange={setUfFilter}
                    placeholder="Todas as UFs"
                    searchable={true}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchEventos}
                  disabled={loading}
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "animate-spin" : ""}
                  />
                  Atualizar
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : eventos.length === 0 ? (
              <div className="rounded-2xl border border-border bg-secondary p-12 text-center">
                <Calendar size={40} className="mx-auto mb-4 text-muted" />
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Nenhum evento encontrado
                </h3>
                <p className="text-sm text-secondary">
                  {ufFilter
                    ? "Nenhum evento encontrado para esta UF. Tente outro filtro."
                    : "Ainda nao ha eventos cadastrados. Volte em breve."}
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {eventos.map((evento) => {
                  const dateLabel = formatEventDate(evento);
                  const status = getStatus(evento);
                  const where = [evento.cidade, evento.uf].filter(Boolean).join(", ");
                  const cat = CATEGORY_LABELS[evento.categoria || ""] || "";

                  return (
                    <article
                      key={evento.id}
                      className="group rounded-2xl border border-border bg-secondary p-5 flex flex-col transition-all duration-200 hover:border-accent/40 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_8px_24px_rgba(0,0,0,0.25)]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            status.color === "accent"
                              ? "bg-accent/15 text-accent"
                              : status.color === "success"
                              ? "bg-success/15 text-success"
                              : status.color === "danger"
                              ? "bg-danger/15 text-danger"
                              : status.color === "warning"
                              ? "bg-warning/15 text-warning"
                              : "bg-white/10 text-muted"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status.color === "accent"
                                ? "bg-accent"
                                : status.color === "success"
                                ? "bg-success"
                                : status.color === "danger"
                                ? "bg-danger"
                                : status.color === "warning"
                                ? "bg-warning"
                                : "bg-muted"
                            }`}
                          />
                          {status.label}
                        </span>

                        {evento.uf && (
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-muted border border-border">
                            {evento.uf}
                          </span>
                        )}
                      </div>

                      <h3 className="text-[15px] font-semibold text-primary mb-2 leading-snug line-clamp-2">
                        {evento.titulo || "Evento automotivo"}
                      </h3>

                      {evento.descricao && (
                        <p className="text-sm text-secondary mb-4 flex-1 line-clamp-3 leading-relaxed">
                          {evento.descricao}
                        </p>
                      )}

                      <div className="space-y-2 mt-auto">
                        {dateLabel && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Calendar size={13} className="shrink-0 text-accent" />
                            <span>{dateLabel}</span>
                          </div>
                        )}
                        {where && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <MapPin size={13} className="shrink-0 text-accent" />
                            <span>{where}</span>
                          </div>
                        )}
                        {evento.local && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Building2 size={13} className="shrink-0 text-accent" />
                            <span className="truncate">{evento.local}</span>
                          </div>
                        )}
                        {cat && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Tag size={13} className="shrink-0 text-accent" />
                            <span>{cat}</span>
                          </div>
                        )}
                        {evento.fonte_nome && (
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Clock size={13} className="shrink-0 text-accent" />
                            <span>{evento.fonte_nome}</span>
                          </div>
                        )}
                      </div>

                      {evento.url && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <a
                            href={evento.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                          >
                            <ExternalLink size={13} />
                            Ver detalhes
                          </a>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}