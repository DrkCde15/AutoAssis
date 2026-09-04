"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: number;
  nome: string;
  email: string;
  is_premium: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<{ two_factor_required?: boolean; pending_token?: string }>;
  register: (data: { nome: string; email: string; password: string; veiculos?: unknown[] }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  authenticatedFetch: typeof fetch;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "autoassist_access_token";
const USER_KEY = "autoassist_user";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, []);

  const authedFetch: typeof fetch = async (input, init) => {
    const token = getToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}${input}`, {
      ...init,
      headers,
      credentials: "include",
    });
  };

  const login = async (email: string, password: string, turnstileToken?: string) => {
    const res = await api.post<{ access_token?: string; two_factor_required?: boolean; pending_token?: string; user?: User }>(
      "/api/login",
      { email, password, ...(turnstileToken ? { turnstile_token: turnstileToken } : {}) }
    );

    if (res.two_factor_required) {
      return { two_factor_required: true, pending_token: res.pending_token };
    }

    if (res.access_token) {
      setToken(res.access_token);
    }
    if (res.user) {
      storeUser(res.user);
      setUser(res.user);
    }
    return {};
  };

  const register = async (data: { nome: string; email: string; password: string; veiculos?: unknown[] }) => {
    const res = await api.post<{ access_token?: string; user?: User }>("/api/cadastro", data);
    if (res.access_token) {
      setToken(res.access_token);
    }
    if (res.user) {
      storeUser(res.user);
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/logout");
    } catch {
      // ignore
    }
    clearAuth();
    setUser(null);
    window.location.href = "/login";
  };

  const updateUser = async (data: Partial<User>) => {
    const res = await authedFetch("/api/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update user");
    const updated = await res.json();
    storeUser(updated);
    setUser(updated);
  };

  const deleteAccount = async () => {
    await authedFetch("/api/user", { method: "DELETE" });
    clearAuth();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        deleteAccount,
        authenticatedFetch: authedFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
