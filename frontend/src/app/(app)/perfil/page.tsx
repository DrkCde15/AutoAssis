"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser, authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  User,
  Mail,
  Shield,
  ShieldOff,
  Crown,
  Car,
  Plus,
  Trash2,
  Camera,
  Copy,
  Share2,
  MessageCircle,
  Loader2,
  Save,
  AlertTriangle,
  Key,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  is_premium: boolean;
  total_consultas: number;
  two_factor_enabled: boolean;
}

interface Vehicle {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  km: number;
  foto_base64?: string;
  foto_url?: string;
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

interface ReferralData {
  referral_code: string;
  referral_link: string;
  total_referrals: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [referral, setReferral] = useState<ReferralData | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newVehiclePlaca, setNewVehiclePlaca] = useState("");
  const [newVehicleMarca, setNewVehicleMarca] = useState("");
  const [newVehicleModelo, setNewVehicleModelo] = useState("");
  const [newVehicleAno, setNewVehicleAno] = useState("");
  const [newVehicleKm, setNewVehicleKm] = useState("");
  const [addingVehicle, setAddingVehicle] = useState(false);

  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAQR, setTwoFAQR] = useState("");

  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);
        setName(currentUser.nome ?? "");
        setEmail(currentUser.email ?? "");

        const [profileRes, vehiclesRes, referralRes] = await Promise.all([
          authFetch("/api/user"),
          authFetch("/api/veiculos"),
          authFetch("/api/referral"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUser((prev) => ({ ...prev, ...profileData }));
        }

        if (vehiclesRes.ok) {
          const vData = await vehiclesRes.json();
          const raw = vData.veiculos ?? vData ?? [];
          setVehicles(raw.map((v: any) => ({
            id: v.id,
            placa: v.placa ?? "",
            marca: v.marca ?? "",
            modelo: v.modelo ?? "",
            ano: v.ano_fabricacao ?? v.ano ?? 0,
            km: v.quilometragem ?? v.km ?? 0,
            foto_url: fotoDataUrl(v.foto_base64),
          })));
        }

        if (referralRes.ok) {
          const rData = await referralRes.json();
          setReferral(rData);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authFetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: name, email }),
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authFetch("/api/user", { method: "DELETE" });
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehiclePlaca.trim() || !newVehicleMarca.trim() || !newVehicleModelo.trim()) return;

    setAddingVehicle(true);
    try {
      const response = await authFetch("/api/veiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placa: newVehiclePlaca,
          marca: newVehicleMarca,
          modelo: newVehicleModelo,
          ano: parseInt(newVehicleAno) || new Date().getFullYear(),
          km: parseInt(newVehicleKm) || 0,
        }),
      });

      if (response.ok) {
        const newVehicle = await response.json();
        setVehicles((prev) => [...prev, newVehicle]);
        setNewVehiclePlaca("");
        setNewVehicleMarca("");
        setNewVehicleModelo("");
        setNewVehicleAno("");
        setNewVehicleKm("");
      }
    } catch (error) {
      console.error("Failed to add vehicle:", error);
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    try {
      await authFetch(`/api/veiculos/${id}`, { method: "DELETE" });
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
    }
  };

  const handlePhotoUpload = async (vehicleId: number, file: File) => {
    const formData = new FormData();
    formData.append("foto", file);

    try {
      const response = await authFetch(`/api/veiculos/${vehicleId}/foto`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicleId ? { ...v, foto_url: fotoDataUrl(data.foto_base64) } : v
          )
        );
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await authFetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode, secret: twoFASecret }),
      });

      if (response.ok) {
        setUser((prev) => (prev ? { ...prev, two_factor_enabled: true } : prev));
        setShow2FASetup(false);
        setTwoFACode("");
        setTwoFASecret("");
      }
    } catch (error) {
      console.error("Failed to enable 2FA:", error);
    }
  };

  const handleDisable2FA = async () => {
    try {
      const response = await authFetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      });

      if (response.ok) {
        setUser((prev) => (prev ? { ...prev, two_factor_enabled: false } : prev));
        setShow2FADisable(false);
        setTwoFACode("");
      }
    } catch (error) {
      console.error("Failed to disable 2FA:", error);
    }
  };

  const handleUpgrade = async () => {
    try {
      const response = await authFetch("/api/pay/preference", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        if (data.init_point) {
          window.location.href = data.init_point;
        }
      }
    } catch (error) {
      console.error("Failed to create payment:", error);
    }
  };

  const copyReferralLink = () => {
    if (referral?.referral_link) {
      navigator.clipboard.writeText(referral.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    if (referral?.referral_link) {
      const text = encodeURIComponent(
        `Use meu link para se cadastrar no AutoAssist: ${referral.referral_link}`
      );
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  };

  const shareGeneral = () => {
    if (referral?.referral_link && navigator.share) {
      navigator.share({
        title: "AutoAssist",
        text: "Use meu link para se cadastrar no AutoAssist",
        url: referral.referral_link,
      });
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

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-[640px] mx-auto px-4 py-8">
        <Card className="bg-secondary border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user.nome?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">{user.nome}</h1>
              <p className="text-secondary">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-muted mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Status</label>
              <div className="flex items-center gap-2">
                <Badge variant={user.is_premium ? "success" : "warning"}>
                  {user.is_premium ? "Premium" : "Gratuito"}
                </Badge>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Total de Consultas</label>
              <p className="text-sm text-primary">{user.total_consultas ?? 0}</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar alterações
          </Button>
        </Card>

        {!user.is_premium && (
          <Card className="bg-secondary border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-warning" />
              <div>
                <h2 className="font-semibold text-primary">Upgrade para Premium</h2>
                <p className="text-sm text-secondary">
                  Acesse todos os recursos ilimitados
                </p>
              </div>
            </div>
            <Button onClick={handleUpgrade} className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              Assinar Premium
            </Button>
          </Card>
        )}

        {referral && (
          <Card className="bg-secondary border-border p-6 mb-6">
            <h2 className="font-semibold text-primary mb-4">Indique e Ganhe</h2>
            <p className="text-sm text-secondary mb-4">
              Compartilhe seu link e ganhe benefícios a cada amigo que se cadastrar.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={referral.referral_link}
                readOnly
                className="flex-1 bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary"
              />
              <Button variant="secondary" size="sm" onClick={copyReferralLink}>
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={shareWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button variant="secondary" className="flex-1" onClick={shareGeneral}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>

            <p className="text-xs text-muted mt-3 text-center">
              {referral.total_referrals} indicações realizadas
            </p>
          </Card>
        )}

        <Card className="bg-secondary border-border p-6 mb-6">
          <h2 className="font-semibold text-primary mb-4">
            <Shield className="w-5 h-5 inline mr-2" />
            Autenticação de Dois Fatores
          </h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-primary">
                Status:{" "}
                <Badge variant={user.two_factor_enabled ? "success" : "danger"}>
                  {user.two_factor_enabled ? "Ativado" : "Desativado"}
                </Badge>
              </p>
            </div>

            {user.two_factor_enabled ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShow2FADisable(true)}
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                Desativar
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShow2FASetup(true)}
              >
                <Key className="w-4 h-4 mr-2" />
                Ativar
              </Button>
            )}
          </div>

          {show2FASetup && (
            <div className="bg-primary border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm text-secondary">
                Configure a autenticação de dois fatores para maior segurança.
              </p>
              <input
                type="text"
                placeholder="Código de verificação"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEnable2FA}>
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShow2FASetup(false);
                    setTwoFACode("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {show2FADisable && (
            <div className="bg-primary border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm text-secondary">
                Insira o código para desativar a autenticação de dois fatores.
              </p>
              <input
                type="text"
                placeholder="Código de verificação"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="text-danger" onClick={handleDisable2FA}>
                  Desativar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShow2FADisable(false);
                    setTwoFACode("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="bg-secondary border-border p-6 mb-6">
          <h2 className="font-semibold text-primary mb-4">
            <Car className="w-5 h-5 inline mr-2" />
            Meus Veículos
          </h2>

          {vehicles.length > 0 && (
            <div className="space-y-3 mb-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-3 bg-primary border border-border rounded-lg p-3"
                >
                  <div className="relative">
                    {vehicle.foto_url ? (
                      <img
                        src={vehicle.foto_url}
                        alt={`${vehicle.marca} ${vehicle.modelo}`}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                        <Car className="w-6 h-6 text-muted" />
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center"
                    >
                      <Camera className="w-3 h-3 text-white" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {vehicle.marca} {vehicle.modelo}
                    </p>
                    <p className="text-xs text-muted">
                      {vehicle.placa} | {vehicle.ano} | {vehicle.km.toLocaleString("pt-BR")} km
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddVehicle} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Placa"
                value={newVehiclePlaca}
                onChange={(e) => setNewVehiclePlaca(e.target.value)}
                required
                className="bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="Marca"
                value={newVehicleMarca}
                onChange={(e) => setNewVehicleMarca(e.target.value)}
                required
                className="bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Modelo"
                value={newVehicleModelo}
                onChange={(e) => setNewVehicleModelo(e.target.value)}
                required
                className="bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <input
                type="number"
                placeholder="Ano"
                value={newVehicleAno}
                onChange={(e) => setNewVehicleAno(e.target.value)}
                className="bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            <input
              type="number"
              placeholder="KM atual"
              value={newVehicleKm}
              onChange={(e) => setNewVehicleKm(e.target.value)}
              className="w-full bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <Button type="submit" className="w-full" disabled={addingVehicle}>
              {addingVehicle ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar veículo
            </Button>
          </form>
        </Card>

        <Card className="bg-danger/10 border-danger/30 p-6">
          <h2 className="font-semibold text-danger mb-2">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            Zona de Perigo
          </h2>
          <p className="text-sm text-secondary mb-4">
            Excluir sua conta é irreversível. Todos os seus dados serão perdidos.
          </p>

          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 text-danger" onClick={handleDeleteAccount}>
                Sim, excluir minha conta
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full text-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir conta
            </Button>
          )}
        </Card>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && vehicles.length > 0) {
              handlePhotoUpload(vehicles[0].id, file);
            }
          }}
        />
      </div>
    </div>
  );
}
