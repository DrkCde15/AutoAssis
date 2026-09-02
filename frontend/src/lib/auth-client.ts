export function authFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") return Promise.reject(new Error("No browser"));

  const token = localStorage.getItem("autoassist_access_token");
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}${input}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("autoassist_access_token");
}

export function getUser(): any {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("autoassist_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isPremium(): boolean {
  const user = getUser();
  return !!user?.is_premium;
}

export function logout(): void {
  localStorage.removeItem("autoassist_access_token");
  localStorage.removeItem("autoassist_refresh_token");
  localStorage.removeItem("autoassist_user");
  window.location.href = "/login";
}
