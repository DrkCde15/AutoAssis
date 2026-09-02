import type { Metadata, Viewport } from "next";
import { Outfit, Fraunces } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { AuthProvider } from "@/lib/auth";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutoAssist: Entenda seu carro antes de gastar dinheiro",
    template: "%s | AutoAssist",
  },
  description:
    "Diagnóstico automotivo com IA, Tabela FIPE, histórico de manutenção e muito mais. Entenda seu carro com o AutoAssist.",
  metadataBase: new URL("https://autoassist-l9lr.onrender.com"),
  openGraph: {
    type: "website",
    siteName: "AutoAssist",
    locale: "pt_BR",
    title: "AutoAssist: Entenda seu carro antes de gastar dinheiro",
    description:
      "Diagnóstico automotivo com IA, Tabela FIPE, histórico de manutenção e muito mais.",
    images: [
      {
        url: "/logo2.png",
        width: 1200,
        height: 630,
        alt: "AutoAssist",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAssist: Entenda seu carro antes de gastar dinheiro",
    description:
      "Diagnóstico automotivo com IA, Tabela FIPE, histórico de manutenção e muito mais.",
    images: ["/logo2.png"],
  },
  icons: {
    icon: "/logo2.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${fraunces.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <AuthProvider>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
