"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import {
  Wrench,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  DollarSign,
  Calendar,
  Clock,
  Bell,
  Mail,
  Loader2,
  Crown,
  Filter,
  Search,
  ChevronDown,
  X,
  Check,
  Car,
} from "lucide-react";

interface Vehicle {
  id: number;
  marca: string;
  modelo: string;
  ano: number;
  placa: string;
}

interface MaintenanceRecord {
  id: number;
  vehicle_id: number;
  vehicle_name?: string;
  description: string;
  cost: number;
  km: number;
  date: string;
  interval_days?: number;
  interval_km?: number;
}

interface Alert {
  id: number;
  record_id: number;
  description: string;
  due_date?: string;
  due_km?: number;
  is_overdue: boolean;
}

interface EmailSettings {
  enabled: boolean;
  email: string;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: false,
    email: "",
  });

  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [km, setKm] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [intervalDays, setIntervalDays] = useState("");
  const [intervalKm, setIntervalKm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editKm, setEditKm] = useState("");
  const [editDate, setEditDate] = useState("");

  const [sortField, setSortField] = useState<"date" | "cost">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterVehicle, setFilterVehicle] = useState<number | null>(null);

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

        const [vehiclesRes, historyRes, alertsRes, emailRes] = await Promise.all([
          authFetch("/api/veiculos"),
          authFetch("/api/maintenance/history"),
          authFetch("/api/maintenance/alerts"),
          authFetch("/api/maintenance/email-settings"),
        ]);

        if (vehiclesRes.ok) {
          const vData = await vehiclesRes.json();
          setVehicles(vData.veiculos ?? vData ?? []);
        }

        if (historyRes.ok) {
          const hData = await historyRes.json();
          setRecords(hData.historico ?? hData ?? []);
        }

        if (alertsRes.ok) {
          const aData = await alertsRes.json();
          setAlerts(aData.alertas ?? aData ?? []);
        }

        if (emailRes.ok) {
          const eData = await emailRes.json();
          setEmailSettings({ enabled: eData.enabled ?? false, email: eData.email ?? "" });
        }
      } catch (error) {
        console.error("Failed to initialize maintenance:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !selectedVehicle) return;

    setSubmitting(true);
    try {
      const response = await authFetch("/api/maintenance/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          veiculo_id: selectedVehicle,
          descricao: description,
          custo: parseFloat(cost) || 0,
          quilometragem_servico: parseInt(km) || 0,
          data_servico: date,
          intervalo_dias: parseInt(intervalDays) || undefined,
          intervalo_km: parseInt(intervalKm) || undefined,
        }),
      });

      if (response.ok) {
        const newRecord = await response.json();
        setRecords((prev) => [newRecord, ...prev]);
        setDescription("");
        setCost("");
        setKm("");
        setDate(new Date().toISOString().split("T")[0]);
        setIntervalDays("");
        setIntervalKm("");
      }
    } catch (error) {
      console.error("Failed to add record:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingId(record.id);
    setEditDescription(record.description);
    setEditCost(String(record.cost));
    setEditKm(String(record.km));
    setEditDate(record.date);
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const response = await authFetch(`/api/maintenance/history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: editDescription,
          custo: parseFloat(editCost) || 0,
          quilometragem_servico: parseInt(editKm) || 0,
          data_servico: editDate,
        }),
      });

      if (response.ok) {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  description: editDescription,
                  cost: parseFloat(editCost) || 0,
                  km: parseInt(editKm) || 0,
                  date: editDate,
                }
              : r
          )
        );
        setEditingId(null);
      }
    } catch (error) {
      console.error("Failed to update record:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await authFetch(`/api/maintenance/history/${id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete record:", error);
    }
  };

  const toggleEmailSettings = async () => {
    try {
      const response = await authFetch("/api/maintenance/email-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !emailSettings.enabled }),
      });

      if (response.ok) {
        setEmailSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
      }
    } catch (error) {
      console.error("Failed to update email settings:", error);
    }
  };

  const totalGasto = records.reduce((sum, r) => sum + r.cost, 0);
  const totalRegistros = records.length;
  const alertasAtrasados = alerts.filter((a) => a.is_overdue).length;

  const sortedRecords = [...records]
    .filter((r) => !filterVehicle || r.vehicle_id === filterVehicle)
    .sort((a, b) => {
      if (sortField === "date") {
        return sortDir === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return sortDir === "asc" ? a.cost - b.cost : b.cost - a.cost;
    });

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
            Assine o plano premium para acessar o histórico de manutenção e alertas inteligentes.
          </p>
          <Button className="w-full" onClick={() => router.push("/perfil")}>
            <Crown className="w-4 h-4 mr-2" />
            Ver Planos
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-[1120px] mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Anotações</h1>
          <p className="text-secondary mt-2">Histórico de manutenção e alertas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-secondary border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted">Total gasto</p>
                <p className="text-xl font-bold text-primary">
                  R$ {totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-secondary border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Wrench className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted">Registros</p>
                <p className="text-xl font-bold text-primary">{totalRegistros}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-secondary border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-danger/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-muted">Alertas atrasados</p>
                <p className="text-xl font-bold text-primary">{alertasAtrasados}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-secondary border-border p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Novo registro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Troca de óleo, revisão geral..."
                  rows={3}
                  required
                  className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Veículo</label>
                <Select
                  options={vehicles.map((v) => ({
                    value: String(v.id),
                    label: `${v.marca} ${v.modelo} (${v.placa})`,
                  }))}
                  value={selectedVehicle ? String(selectedVehicle) : ""}
                  onChange={(val) => setSelectedVehicle(parseInt(val) || null)}
                  placeholder="Selecione..."
                  searchable={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">KM</label>
                  <input
                    type="number"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                    placeholder="0"
                    className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Intervalo (dias)</label>
                  <input
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    placeholder="Ex: 90"
                    className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Intervalo (km)</label>
                  <input
                    type="number"
                    value={intervalKm}
                    onChange={(e) => setIntervalKm(e.target.value)}
                    placeholder="Ex: 10000"
                    className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar registro
              </Button>
            </form>
          </Card>

          <Card className="bg-secondary border-border p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Alertas inteligentes</h2>

            <div className="flex items-center justify-between mb-4 p-3 bg-primary border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-sm font-medium text-primary">Notificações por e-mail</p>
                  <p className="text-xs text-muted">
                    {emailSettings.enabled ? "Ativadas" : "Desativadas"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleEmailSettings}
                className={`w-12 h-6 rounded-full transition-colors ${
                  emailSettings.enabled ? "bg-success" : "bg-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    emailSettings.enabled ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">Nenhum alerta no momento</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${
                      alert.is_overdue
                        ? "bg-danger/10 border-danger/30"
                        : "bg-primary border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 ${
                          alert.is_overdue ? "text-danger" : "text-warning"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-primary">{alert.description}</p>
                        {alert.due_date && (
                          <p className="text-xs text-muted mt-1">
                            Prazo: {new Date(alert.due_date).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                        {alert.due_km && (
                          <p className="text-xs text-muted">
                            KM: {alert.due_km.toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="bg-secondary border-border p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-primary">Histórico</h2>

            <div className="flex items-center gap-3">
              <div className="w-48">
                <Select
                  options={vehicles.map((v) => ({
                    value: String(v.id),
                    label: `${v.marca} ${v.modelo}`,
                  }))}
                  value={filterVehicle ? String(filterVehicle) : ""}
                  onChange={(val) => setFilterVehicle(parseInt(val) || null)}
                  placeholder="Todos os veículos"
                  searchable={false}
                />
              </div>

              <div className="w-44">
                <Select
                  options={[
                    { value: "date-desc", label: "Mais recente" },
                    { value: "date-asc", label: "Mais antigo" },
                    { value: "cost-desc", label: "Maior custo" },
                    { value: "cost-asc", label: "Menor custo" },
                  ]}
                  value={`${sortField}-${sortDir}`}
                  onChange={(val) => {
                    const [field, dir] = val.split("-");
                    setSortField(field as "date" | "cost");
                    setSortDir(dir as "asc" | "desc");
                  }}
                  placeholder="Ordenar..."
                  searchable={false}
                />
              </div>
            </div>
          </div>

          {sortedRecords.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-primary border border-border rounded-lg p-4"
                >
                  {editingId === record.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="number"
                          value={editCost}
                          onChange={(e) => setEditCost(e.target.value)}
                          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                        />
                        <input
                          type="number"
                          value={editKm}
                          onChange={(e) => setEditKm(e.target.value)}
                          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                        />
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(record.id)}>
                          <Check className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary">{record.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-secondary">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.date).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {record.vehicle_name ?? `Veículo #${record.vehicle_id}`}
                          </span>
                          {record.km > 0 && (
                            <span>{record.km.toLocaleString("pt-BR")} km</span>
                          )}
                          {record.cost > 0 && (
                            <span className="text-success font-medium">
                              R$ {record.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
