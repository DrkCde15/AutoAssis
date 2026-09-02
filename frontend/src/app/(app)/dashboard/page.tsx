"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Car,
  Plus,
  TrendingUp,
  Wrench,
  Shield,
  MessageCircle,
  ChevronRight,
  Activity,
  Gauge,
  Calendar,
  AlertTriangle,
  Loader2,
  Crown,
  X,
  History,
  Share2,
  FileText,
  Copy,
  Check,
} from "lucide-react";

const MOD_CATEGORIAS = ["visual", "performance", "audio", "rodas", "suspensao", "interior", "eletronica", "outro"];
const MOD_LABELS: Record<string, string> = {
  visual: "Visual", performance: "Performance", audio: "Audio",
  rodas: "Rodas", suspensao: "Suspensao", interior: "Interior",
  eletronica: "Eletronica", outro: "Outro",
};

interface ModRow {
  categoria: string;
  nome: string;
  valor: string;
}

interface ModHistoryItem {
  created_at: string;
  qtd_modificacoes: number;
  valor_estimado: string | null;
}

interface Vehicle {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  km: number;
  foto_url?: string;
  health_score?: number;
  valor_fipe?: number;
  proxima_manutencao?: string;
  patrimonio?: number;
  modificacoes?: any[];
  fipe_ajustada?: number;
}

interface DashboardData {
  vehicles: Vehicle[];
  total_patrimonio: number;
  is_premium: boolean;
}

function fotoDataUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith("data:")) return raw;
  let mime = "image/jpeg";
  if (raw.startsWith("iVBOR")) mime = "image/png";
  else if (raw.startsWith("R0lG")) mime = "image/gif";
  else if (raw.startsWith("UklGR")) mime = "image/webp";
  return `data:${mime};base64,${raw}`;
}

function parseFipeValor(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    if (!isNaN(n)) return n;
  }
  return undefined;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVehicle, setExpandedVehicle] = useState<number | null>(null);

  const [modVehicleId, setModVehicleId] = useState<number | null>(null);
  const [modVehicleName, setModVehicleName] = useState("");
  const [modRows, setModRows] = useState<ModRow[]>([{ categoria: "visual", nome: "", valor: "" }]);
  const [modStatus, setModStatus] = useState("");
  const [modSaving, setModSaving] = useState(false);
  const [modHistory, setModHistory] = useState<ModHistoryItem[]>([]);
  const [modHistoryOpen, setModHistoryOpen] = useState(false);
  const [modShareUrl, setModShareUrl] = useState("");
  const [modCopied, setModCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);

        const response = await authFetch("/api/dashboard");
        if (response.ok) {
          const items = await response.json();
          const vehicles: Vehicle[] = (Array.isArray(items) ? items : []).map((item: any) => ({
            id: item.veiculo?.id ?? 0,
            placa: item.veiculo?.placa ?? "",
            marca: item.veiculo?.marca ?? "",
            modelo: item.veiculo?.modelo ?? "",
            ano: item.veiculo?.ano_fabricacao ?? 0,
            km: item.veiculo?.quilometragem ?? 0,
            foto_url: fotoDataUrl(item.veiculo?.foto_base64),
            health_score: item.estatisticas_extras?.health_score ?? 0,
            valor_fipe: parseFipeValor(item.fipe?.Valor),
            proxima_manutencao: item.predicao?.proxima_manutencao ?? undefined,
            patrimonio: parseFipeValor(item.fipe?.Valor),
            modificacoes: item.veiculo?.modificacoes ?? undefined,
            fipe_ajustada: item.veiculo?.fipe_ajustada ?? undefined,
          }));
          setData({ vehicles, total_patrimonio: vehicles.reduce((s, v) => s + (v.patrimonio ?? 0), 0), is_premium: true });
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const openModPassport = (vehicleId: number, marca: string, modelo: string, existingMods?: any[]) => {
    setModVehicleId(vehicleId);
    setModVehicleName(`${marca} ${modelo}`);
    const parsed: ModRow[] = (existingMods ?? []).map((m: any) => ({
      categoria: m.categoria ?? "visual",
      nome: m.nome ?? "",
      valor: m.valor != null ? String(m.valor) : "",
    }));
    setModRows(parsed.length > 0 ? parsed : [{ categoria: "visual", nome: "", valor: "" }]);
    setModStatus("");
    setModHistory([]);
    setModHistoryOpen(false);
    setModShareUrl("");
    setModCopied(false);
  };

  const closeModPassport = () => {
    setModVehicleId(null);
    setModVehicleName("");
    setModRows([{ categoria: "visual", nome: "", valor: "" }]);
    setModStatus("");
    setModHistory([]);
    setModHistoryOpen(false);
    setModShareUrl("");
    setModCopied(false);
  };

  const addModRow = () => {
    setModRows((prev) => [...prev, { categoria: "visual", nome: "", valor: "" }]);
  };

  const removeModRow = (index: number) => {
    setModRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateModRow = (index: number, field: keyof ModRow, value: string) => {
    setModRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const saveModPassport = async () => {
    if (!modVehicleId) return;
    setModSaving(true);
    setModStatus("Salvando...");
    try {
      const modificacoes = modRows
        .filter((r) => r.nome.trim())
        .map((r) => ({
          categoria: r.categoria,
          nome: r.nome.trim(),
          valor: r.valor === "" ? null : Number(r.valor),
        }));
      const res = await authFetch(`/api/veiculos/${modVehicleId}/modificacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modificacoes }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setModStatus(result.error || "Erro ao salvar.");
        return;
      }
      setModStatus("Mod Passport atualizado!");
      if (data) {
        setData({
          ...data,
          vehicles: data.vehicles.map((v) =>
            v.id === modVehicleId
              ? { ...v, modificacoes, fipe_ajustada: result.fipe_ajustada }
              : v
          ),
        });
      }
      setTimeout(closeModPassport, 900);
    } catch {
      setModStatus("Erro de conexao.");
    } finally {
      setModSaving(false);
    }
  };

  const loadModHistory = async () => {
    if (!modVehicleId) return;
    setModHistoryOpen(!modHistoryOpen);
    if (modHistoryOpen) return;
    try {
      const res = await authFetch(`/api/veiculos/${modVehicleId}/modificacoes/history`);
      const result = await res.json().catch(() => ({}));
      setModHistory(result.history ?? []);
    } catch {
      setModHistory([]);
    }
  };

  const shareModPassport = async () => {
    if (!modVehicleId) return;
    setModStatus("Gerando link...");
    try {
      const res = await authFetch(`/api/veiculos/${modVehicleId}/mod-passport/share`, {
        method: "POST",
      });
      const result = await res.json().catch(() => ({}));
      if (result.share_url) {
        setModShareUrl(result.share_url);
        setModStatus("");
      } else {
        setModStatus(result.error || "Erro ao gerar link.");
      }
    } catch {
      setModStatus("Erro de conexao.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isPremium = user?.is_premium ?? false;

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 bg-secondary border-border">
          <Crown className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">Recurso Premium</h1>
          <p className="text-secondary mb-6">
            Assine o plano premium para acessar o Dashboard completo com análises detalhadas do seu veículo.
          </p>
          <Link href="/perfil">
            <Button className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const vehicles = data?.vehicles ?? [];
  const totalPatrimonio = data?.total_patrimonio ?? 0;

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-[1000px] mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-secondary mt-2">Visão geral da sua garagem</p>
        </div>

        <div className="bg-secondary border border-border rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-sm text-muted">Veículos</p>
                  <p className="text-xl font-semibold text-primary">{vehicles.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-muted">Patrimônio Total</p>
                  <p className="text-xl font-semibold text-primary">
                    R$ {totalPatrimonio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <Link href="/perfil">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar veículo
              </Button>
            </Link>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <Card className="p-12 text-center bg-secondary border-border">
            <Car className="w-16 h-16 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">Nenhum veículo cadastrado</h2>
            <p className="text-secondary mb-6">
              Adicione seu primeiro veículo para começar a acompanhar a saúde e manutenção.
            </p>
            <Link href="/perfil">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar veículo
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="bg-secondary border-border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {vehicle.foto_url ? (
                        <img
                          src={vehicle.foto_url}
                          alt={`${vehicle.marca} ${vehicle.modelo}`}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center">
                          <Car className="w-8 h-8 text-muted" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-primary">
                          {vehicle.marca} {vehicle.modelo}
                        </h3>
                        <p className="text-secondary">{vehicle.ano} | {vehicle.km.toLocaleString("pt-BR")} km</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedVehicle(expandedVehicle === vehicle.id ? null : vehicle.id)}
                    >
                      <ChevronRight
                        className={`w-5 h-5 text-muted transition-transform ${
                          expandedVehicle === vehicle.id ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>

                {expandedVehicle === vehicle.id && (
                  <div className="border-t border-border p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="bg-primary border-border p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Activity className="w-5 h-5 text-success" />
                          <p className="text-sm text-muted">Health Score</p>
                        </div>
                        <div className="flex items-center justify-center py-4">
                          <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15.91" fill="none" stroke="#27272a" strokeWidth="3" />
                              <circle
                                cx="18"
                                cy="18"
                                r="15.91"
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="3"
                                strokeDasharray={`${vehicle.health_score ?? 0} 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary">{vehicle.health_score ?? 0}%</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-primary border-border p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Gauge className="w-5 h-5 text-accent" />
                          <p className="text-sm text-muted">Valor de Mercado (FIPE)</p>
                        </div>
                        <p className="text-2xl font-bold text-primary mt-4">
                          R$ {(vehicle.valor_fipe ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </Card>

                      <Card className="bg-primary border-border p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Wrench className="w-5 h-5 text-warning" />
                          <p className="text-sm text-muted">Próxima Manutenção</p>
                        </div>
                        {vehicle.proxima_manutencao ? (
                          <div className="mt-4">
                            <p className="text-lg font-semibold text-primary">{vehicle.proxima_manutencao}</p>
                          </div>
                        ) : (
                          <p className="text-muted mt-4">Nenhuma programada</p>
                        )}
                      </Card>

                      <Card className="bg-primary border-border p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <TrendingUp className="w-5 h-5 text-success" />
                          <p className="text-sm text-muted">Valor Estimado</p>
                        </div>
                        <p className="text-2xl font-bold text-primary mt-4">
                          R$ {(vehicle.patrimonio ?? vehicle.valor_fipe ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </Card>
                    </div>

                    <div
                      className="cursor-pointer"
                      onClick={() => openModPassport(vehicle.id, vehicle.marca, vehicle.modelo, vehicle.modificacoes)}
                    >
                      <Card className="bg-primary border-border p-4 hover:border-accent transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-accent" />
                            <div>
                              <p className="font-medium text-primary">Mod Passport</p>
                              <p className="text-sm text-secondary">
                                Histórico completo de manutenção e documentos do veículo
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted" />
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link href="/chat">
            <Button className="w-full sm:w-auto" size="lg">
              <MessageCircle className="w-5 h-5 mr-2" />
              Analisar dados com o NOG
            </Button>
          </Link>
        </div>
      </div>

      {modVehicleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) closeModPassport(); }}>
          <Card className="w-full max-w-lg bg-secondary border-border max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-primary">Mod Passport</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={closeModPassport}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="px-4 pt-3 text-sm text-secondary">Veiculo: {modVehicleName}</p>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {modRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select
                    value={row.categoria}
                    onChange={(e) => updateModRow(i, "categoria", e.target.value)}
                    className="bg-primary border border-border rounded-lg px-2 py-2 text-sm text-primary shrink-0 focus:outline-none focus:border-accent"
                  >
                    {MOD_CATEGORIAS.map((c) => (
                      <option key={c} value={c}>{MOD_LABELS[c]}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Descricao (ex: Escape esportivo)"
                    value={row.nome}
                    onChange={(e) => updateModRow(i, "nome", e.target.value)}
                    className="flex-1 bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent min-w-0"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Valor R$"
                    value={row.valor}
                    onChange={(e) => updateModRow(i, "valor", e.target.value)}
                    className="w-28 bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeModRow(i)}>
                    <X className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              ))}

              <Button variant="ghost" className="w-full" size="sm" onClick={addModRow}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar modificacao
              </Button>

              {modHistoryOpen && (
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-sm font-medium text-primary mb-2">Historico</p>
                  {modHistory.length === 0 ? (
                    <p className="text-xs text-muted">Nenhum snapshot salvo ainda.</p>
                  ) : (
                    modHistory.map((h, i) => (
                      <div key={i} className="flex justify-between text-xs text-secondary py-1 border-b border-border">
                        <span>{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                        <span>{h.qtd_modificacoes} mod(s)</span>
                        <span>{h.valor_estimado || "-"}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {modShareUrl && (
                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-xs text-muted mb-2">Link de compartilhamento:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={modShareUrl}
                      className="flex-1 bg-primary border border-border rounded-lg px-3 py-2 text-xs text-primary"
                    />
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(modShareUrl); setModCopied(true); setTimeout(() => setModCopied(false), 2000); }}>
                      {modCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    {modShareUrl.includes("/api/public/mod-passport/") && (
                      <a href={modShareUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm"><FileText className="w-4 h-4" /></Button>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {modStatus && (
                <p className={`text-xs text-center ${modStatus.includes("Erro") || modStatus.includes("conexao") ? "text-danger" : "text-success"}`}>
                  {modStatus}
                </p>
              )}
            </div>

            <div className="p-4 border-t border-border space-y-2 shrink-0">
              <Button className="w-full" onClick={saveModPassport} disabled={modSaving || !modRows.some((r) => r.nome.trim())}>
                {modSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={loadModHistory}>
                  <History className="w-4 h-4 mr-2" /> Historico
                </Button>
                <Button variant="ghost" className="flex-1" onClick={shareModPassport}>
                  <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
