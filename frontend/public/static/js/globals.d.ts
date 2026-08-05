// Declaracoes de tipos para globais expostos em runtime por scripts carregados
// via <script> (padrao vanilla JS do projeto, sem bundler/imports).
// @ts-nocheck

interface Window {
  SecurityUtils?: {
    escapeHTML(value: unknown): string;
    setSafeText(el: Element, message: string, prefix?: string): void;
  };
  AutoAssistAnalytics?: unknown;
  anime?: any;
  Lenis?: any;
  AAAnim?: any;
}

declare const SecurityUtils: {
  escapeHTML(value: unknown): string;
  setSafeText(el: Element, message: string, prefix?: string): void;
};

declare const anime: any;
declare const Lenis: any;
