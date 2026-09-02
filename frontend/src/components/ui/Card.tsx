import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "featured";
}

export function Card({ children, className = "", variant = "default" }: CardProps) {
  const base = "rounded-2xl border transition-all duration-200";
  const variants = {
    default: "bg-secondary border-border hover:border-border-hover",
    featured: "bg-secondary border-accent shadow-glow",
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 pt-6 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}
