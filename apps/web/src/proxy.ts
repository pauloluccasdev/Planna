import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  accessCookie,
  refreshCookie,
  sessionCookieOptions,
} from "./app/_lib/session-config";

type RefreshResponse = {
  data?: {
    session?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
};

const refreshBeforeSeconds = 60;

function needsRefresh(token: string | undefined) {
  if (!token) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: number };
    return (
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1_000) + refreshBeforeSeconds
    );
  } catch {
    return true;
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(accessCookie);
  response.cookies.delete(refreshCookie);
  return response;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(accessCookie)?.value;
  if (!needsRefresh(accessToken)) return NextResponse.next();

  const refreshToken = request.cookies.get(refreshCookie)?.value;
  if (!refreshToken) return redirectToLogin(request);

  const apiBase = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return redirectToLogin(request);

  try {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return redirectToLogin(request);
    const body = (await response.json()) as RefreshResponse;
    const session = body.data?.session;
    if (!session) return redirectToLogin(request);

    request.cookies.set(accessCookie, session.accessToken);
    request.cookies.set(refreshCookie, session.refreshToken);
    const next = NextResponse.next({ request: { headers: request.headers } });
    next.cookies.set(
      accessCookie,
      session.accessToken,
      sessionCookieOptions(session.expiresIn),
    );
    next.cookies.set(
      refreshCookie,
      session.refreshToken,
      sessionCookieOptions(60 * 60 * 24 * 30),
    );
    return next;
  } catch {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: "/app/:path*",
};
