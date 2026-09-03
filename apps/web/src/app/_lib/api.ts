import { cookies } from "next/headers";

const accessCookie = "planna_access_token";
const refreshCookie = "planna_refresh_token";

export function apiUrl(path: string) {
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("API_URL is not configured");
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function authenticatedApi(path: string, init?: RequestInit) {
  const token = (await cookies()).get(accessCookie)?.value;
  if (!token) return null;
  return fetch(apiUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      ...init?.headers,
      authorization: `Bearer ${token}`,
    },
  });
}

export async function saveSession(session: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) {
  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(accessCookie, session.accessToken, {
    ...common,
    maxAge: session.expiresIn,
  });
  store.set(refreshCookie, session.refreshToken, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(accessCookie);
  store.delete(refreshCookie);
}
