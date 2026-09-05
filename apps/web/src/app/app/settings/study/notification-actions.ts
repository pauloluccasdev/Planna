"use server";

import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

type SubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

async function apiMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return payload?.error?.message ?? fallback;
}

export async function registerPushSubscription(input: SubscriptionInput) {
  const response = await authenticatedApi("push-subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiMessage(
        response,
        "Não foi possível registrar o navegador.",
      ),
    };
  const { data } = (await response.json()) as { data: { id: string } };
  return { id: data.id };
}

export async function revokePushSubscription(id: string) {
  const response = await authenticatedApi(`push-subscriptions/${id}`, {
    method: "DELETE",
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok && response.status !== 404)
    return {
      message: await apiMessage(
        response,
        "Não foi possível revogar o navegador.",
      ),
    };
  return { revoked: true };
}
