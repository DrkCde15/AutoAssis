"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Select } from "@/components/ui/Select";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Vehicle {
  tipo: string;
  marca: string;
  modelo: string;
  ano_fabricacao: string;
  ano_compra: string;
  quilometragem: string;
}

const emptyVehicle: Vehicle = {
  tipo: "carro",
  marca: "",
  modelo: "",
  ano_fabricacao: "",
  ano_compra: "",
  quilometragem: "",
};

export default function CadastroPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRef(params.get("ref"));
  }, []);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ ...emptyVehicle }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateVehicle = (index: number, field: keyof Vehicle, value: string) => {
    setVehicles((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const addVehicle = () => {
    setVehicles((prev) => [...prev, { ...emptyVehicle }]);
  };

  const removeVehicle = (index: number) => {
    setVehicles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: any = { nome, email, password };
      if (ref) payload.ref = ref;
      if (hasVehicle) {
        payload.veiculos = vehicles.filter((v) => v.marca || v.modelo);
      }
      await register(payload);
      router.push("/login?cadastro=success");
    } catch (err: any) {
      setError(err?.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary p-8">
      <h1 className="mb-2 text-center font-display text-2xl font-bold text-primary">
        Criar sua conta
      </h1>
      <p className="mb-6 text-center text-sm text-muted">
        Comece a cuidar do seu veículo com a AutoAssist
      </p>

      <a
        href={`${API_URL}/api/auth/google/login`}
        className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-border/50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Cadastrar com Google
      </a>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-secondary px-3 text-muted">ou com e-mail</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary">
            Nome Completo
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="João da Silva"
            required
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary">
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-secondary">
            Senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 pr-11 text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasVehicle}
              onChange={(e) => {
                setHasVehicle(e.target.checked);
                if (e.target.checked && vehicles.length === 0) {
                  setVehicles([{ ...emptyVehicle }]);
                }
              }}
              className="h-4 w-4 rounded border-border bg-secondary text-accent focus:ring-accent"
            />
            <span className="text-sm text-secondary">Possuo um veículo</span>
          </label>
        </div>

        {hasVehicle && (
          <div className="space-y-4 rounded-xl border border-border bg-secondary/50 p-4">
            {vehicles.map((vehicle, index) => (
              <div key={index} className="space-y-3">
                {index > 0 && <div className="border-t border-border pt-3" />}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary">
                    Veículo {index + 1}
                  </span>
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVehicle(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted">Tipo</label>
                  <Select
                    options={[
                      { value: "carro", label: "Carro" },
                      { value: "moto", label: "Moto" },
                      { value: "caminhao", label: "Caminhao" },
                      { value: "outro", label: "Outro" },
                    ]}
                    value={vehicle.tipo}
                    onChange={(val) => updateVehicle(index, "tipo", val)}
                    placeholder="Selecione..."
                    searchable={false}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Marca</label>
                    <input
                      type="text"
                      value={vehicle.marca}
                      onChange={(e) => updateVehicle(index, "marca", e.target.value)}
                      placeholder="Ex: Toyota"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Modelo</label>
                    <input
                      type="text"
                      value={vehicle.modelo}
                      onChange={(e) => updateVehicle(index, "modelo", e.target.value)}
                      placeholder="Ex: Corolla"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Ano fab.</label>
                    <input
                      type="number"
                      value={vehicle.ano_fabricacao}
                      onChange={(e) => updateVehicle(index, "ano_fabricacao", e.target.value)}
                      placeholder="2022"
                      min="1900"
                      max="2030"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Ano compra</label>
                    <input
                      type="number"
                      value={vehicle.ano_compra}
                      onChange={(e) => updateVehicle(index, "ano_compra", e.target.value)}
                      placeholder="2023"
                      min="1900"
                      max="2030"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Km</label>
                    <input
                      type="number"
                      value={vehicle.quilometragem}
                      onChange={(e) => updateVehicle(index, "quilometragem", e.target.value)}
                      placeholder="45000"
                      min="0"
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addVehicle}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted transition-colors hover:border-accent/50 hover:text-secondary"
            >
              <Plus className="h-4 w-4" />
              Adicionar outro veículo
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar Minha Conta
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Ao criar sua conta, você concorda com nossos{" "}
        <Link href="/termos" className="text-accent hover:text-accent/80">
          Termos de Uso
        </Link>{" "}
        e{" "}
        <Link href="/privacidade" className="text-accent hover:text-accent/80">
          Política de Privacidade
        </Link>
        .
      </p>

      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="text-accent hover:text-accent/80">
          Já possui conta? Fazer Login
        </Link>
      </div>
    </div>
  );
}
