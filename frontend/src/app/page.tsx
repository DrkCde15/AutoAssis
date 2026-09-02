import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import NogDemo from "@/components/landing/NogDemo";
import PainSection from "@/components/landing/PainSection";
import Pillars from "@/components/landing/Pillars";
import ProductShowcase from "@/components/landing/ProductShowcase";
import TrustSection from "@/components/landing/TrustSection";
import SocialProof from "@/components/landing/SocialProof";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AutoAssist",
  url: "https://autoassist-l9lr.onrender.com",
  description:
    "Diagnóstico automotivo com IA, Tabela FIPE, histórico de manutenção e muito mais.",
  applicationCategory: "AutomotiveApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <NogDemo />
        <Features />
        <PainSection />
        <Pillars />
        <ProductShowcase />
        <TrustSection />
        <SocialProof />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
