"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Terminal } from "lucide-react";

const plans = [
  { value: "starter", label: "Starter - 1.000 chamadas/mes" },
  { value: "business", label: "Business - 10.000 chamadas/mes" },
  { value: "enterprise", label: "Enterprise - 20.000+ chamadas/mes" },
];

export function B2BForm() {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-primary">
            Criar API Key
          </h3>
          <p className="mt-1 text-sm text-secondary">
            Gere suas credenciais de acesso a API
          </p>
        </CardHeader>
        <CardBody>
          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary">
                Nome da chave
              </label>
              <input
                type="text"
                placeholder="Ex: Producao"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-primary px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary">
                Plano
              </label>
              <Select
                options={plans}
                value={plan}
                onChange={setPlan}
                placeholder="Selecione o plano"
                searchable={false}
              />
            </div>
            <Button variant="primary" className="w-full">
              Criar API Key
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-primary">
            Uso da API
          </h3>
          <p className="mt-1 text-sm text-secondary">
            Acompanhe suas chamadas em tempo real
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-primary">
                  Chamadas este mes
                </p>
                <p className="text-xs text-muted">
                  Reset dia 1 de cada mes
                </p>
              </div>
              <span className="text-2xl font-bold text-primary">0</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium text-primary">
                  Chamadas restantes
                </p>
                <p className="text-xs text-muted">Limite do plano</p>
              </div>
              <span className="text-2xl font-bold text-accent">-</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}