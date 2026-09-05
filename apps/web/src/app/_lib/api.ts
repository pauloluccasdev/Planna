import { cookies } from "next/headers";
import {
  accessCookie,
  refreshCookie,
  sessionCookieOptions,
} from "./session-config";

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
  store.set(accessCookie, session.accessToken, {
    ...sessionCookieOptions(session.expiresIn),
  });
  store.set(refreshCookie, session.refreshToken, {
    ...sessionCookieOptions(60 * 60 * 24 * 30),
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(accessCookie);
  store.delete(refreshCookie);
}
