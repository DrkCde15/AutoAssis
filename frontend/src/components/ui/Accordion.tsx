"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionItemProps {
  question: string;
  answer: ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({ question, answer, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-semibold text-primary transition-colors hover:text-accent cursor-pointer"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <div className="text-sm leading-relaxed text-secondary">{answer}</div>
      </div>
    </div>
  );
}

export function Accordion({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-border ${className}`}>{children}</div>;
}
