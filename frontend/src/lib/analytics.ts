"use client";

const ANALYTICS_KEY = "autoassist_analytics_id";
const CONSENT_KEY = "autoassist_analytics_consent";
const ATTRIBUTION_KEY = "autoassist_attribution";

function getAnonymousId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(ANALYTICS_KEY);
  if (id) return id;

  if (window.crypto?.randomUUID) {
    id = window.crypto.randomUUID();
  } else {
    id = `aa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  localStorage.setItem(ANALYTICS_KEY, id);
  return id;
}

function getConsent(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CONSENT_KEY) ?? "";
}

function saveAttribution(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(ATTRIBUTION_KEY)) return;

  const params = new URLSearchParams(window.location.search);
  const attribution = {
    utm_source: params.get("utm_source")?.slice(0, 120) ?? "",
    utm_medium: params.get("utm_medium")?.slice(0, 120) ?? "",
    utm_campaign: params.get("utm_campaign")?.slice(0, 120) ?? "",
    utm_term: params.get("utm_term")?.slice(0, 120) ?? "",
    utm_content: params.get("utm_content")?.slice(0, 120) ?? "",
    referrer: document.referrer?.slice(0, 500) ?? "",
    landing_path: window.location.pathname,
  };

  const hasValues = Object.values(attribution).some((v) => v !== "");
  if (hasValues) {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  }
}

function sanitizeMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set([
    "authorization", "cookie", "password", "token", "refresh_token",
    "access_token", "jwt", "secret", "email", "telefone", "phone",
    "cpf", "cnpj", "placa", "message", "mensagem", "prompt", "content",
  ]);

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (blocked.has(key.toLowerCase())) continue;
    if (key.length > 80) continue;

    if (typeof value === "string") {
      sanitized[key] = value.trim().slice(0, 240);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value
        .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
        .slice(0, 10);
    }
  }

  return sanitized;
}

export function trackPageView(path: string): void {
  if (getConsent() !== "accepted") return;

  const metadata = sanitizeMetadata({
    page_title: document.title,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) ?? "{}"),
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  fetch(`${API_URL}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      event_type: "page_view",
      path,
      anonymous_id: getAnonymousId(),
      metadata,
    }),
  }).catch(() => {});
}

export function trackEvent(eventType: string, metadata?: Record<string, unknown>): void {
  if (getConsent() !== "accepted") return;
  if (!/^[a-zA-Z0-9_.:-]{1,80}$/.test(eventType)) return;

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  fetch(`${API_URL}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      event_type: eventType,
      path: window.location.pathname,
      anonymous_id: getAnonymousId(),
      metadata: metadata ? sanitizeMetadata(metadata) : {},
    }),
  }).catch(() => {});
}

export function initAnalytics(): void {
  saveAttribution();
  trackPageView(window.location.pathname);
}
