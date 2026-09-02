"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle, Loader2, Home, RefreshCw } from "lucide-react";
import { getUser } from "@/lib/auth-client";

type PaymentStatus = "loading" | "ok" | "warn" | "error";

export default function PagamentoSucessoPage() {
  const [status, setStatus] = useState<PaymentStatus>("loading");

  const checkStatus = async () => {
    setStatus("loading");
    try {
      const user = await getUser();
      if (user?.is_premium) {
        setStatus("ok");
      } else {
        setStatus("warn");
      }
    } catch {
      setStatus("warn");
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const statusConfig = {
    loading: {
      icon: Loader2,
      iconClass: "animate-spin text-accent",
      bgClass: "bg-accent/10",
      title: "Verificando pagamento...",
      description: "Aguarde enquanto confirmamos seu pagamento.",
      badge: null as null,
    },
    ok: {
      icon: CheckCircle2,
      iconClass: "text-success",
      bgClass: "bg-success/10",
      title: "Pagamento recebido",
      description:
        "Seu acesso premium foi liberado. Aproveite todas as funcionalidades do AutoAssist!",
      badge: { label: "Confirmado", variant: "success" as const },
    },
    warn: {
      icon: Loader2,
      iconClass: "animate-spin text-warning",
      bgClass: "bg-warning/10",
      title: "Pagamento em processamento",
      description:
        "Seu pagamento ainda está sendo processado. Isso pode levar alguns minutos.",
      badge: { label: "Pendente", variant: "warning" as const },
    },
    error: {
      icon: AlertCircle,
      iconClass: "text-danger",
      bgClass: "bg-danger/10",
      title: "Problema com o pagamento",
      description:
        "Não foi possível confirmar seu pagamento. Entre em contato com o suporte.",
      badge: { label: "Erro", variant: "danger" as const },
    },
  };

  const config = statusConfig[status];

  return (
    <>
      <Navbar />
      <main className="section pt-28">
        <div className="section__wrap">
          <div className="mx-auto max-w-md text-center">
            <Card>
              <CardBody>
                <div
                  className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${config.bgClass}`}
                >
                  <config.icon size={32} className={config.iconClass} />
                </div>

                <h1 className="text-2xl font-bold text-primary mb-3">
                  {config.title}
                </h1>

                <p className="text-sm text-secondary mb-4">
                  {config.description}
                </p>

                {config.badge && (
                  <div className="mb-6">
                    <Badge variant={config.badge.variant}>
                      {config.badge.label}
                    </Badge>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Link href="/">
                    <Button variant="primary" className="w-full">
                      <Home size={16} />
                      Ir para o início
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={checkStatus}
                    disabled={status === "loading"}
                  >
                    <RefreshCw
                      size={16}
                      className={status === "loading" ? "animate-spin" : ""}
                    />
                    Atualizar status
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
