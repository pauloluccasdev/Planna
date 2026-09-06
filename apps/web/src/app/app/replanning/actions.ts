"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export type ReplanningState = { message?: string; success?: string };

async function apiMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return payload?.error?.message ?? fallback;
}

function brazilInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-03:00`
    : null;
}

export async function updateSuggestion(
  suggestionId: string,
  revision: number,
  _state: ReplanningState,
  formData: FormData,
): Promise<ReplanningState> {
  const startsAt = brazilInstant(String(formData.get("startsAt") ?? ""));
  const endsAt = brazilInstant(String(formData.get("endsAt") ?? ""));
  if (!startsAt || !endsAt) return { message: "Informe o início e o término." };
  if (new Date(startsAt) <= new Date())
    return { message: "Escolha um horário futuro." };
  if (new Date(startsAt) >= new Date(endsAt))
    return { message: "O término deve ser posterior ao início." };
  const response = await authenticatedApi(
    `replanning-suggestions/${suggestionId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision, startsAt, endsAt }),
    },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiMessage(
        response,
        "Não foi possível alterar a sugestão.",
      ),
    };
  revalidatePath("/app/replanning");
  return { success: "Novo horário salvo. Revise e confirme quando quiser." };
}

export async function acceptSuggestion(
  suggestionId: string,
  _state: ReplanningState,
  formData: FormData,
): Promise<ReplanningState> {
  if (formData.get("confirmation") !== "confirmed")
    return { message: "Confirme antes de alterar seu planejamento." };
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const response = await authenticatedApi(
    `replanning-suggestions/${suggestionId}/accept`,
    {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey },
    },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiMessage(
        response,
        "Não foi possível aceitar a sugestão.",
      ),
    };
  revalidatePath("/app");
  revalidatePath("/app/replanning");
  return { success: "Replanejamento confirmado e adicionado à agenda." };
}

export async function rejectSuggestion(
  suggestionId: string,
  _state: ReplanningState,
): Promise<ReplanningState> {
  void _state;
  const response = await authenticatedApi(
    `replanning-suggestions/${suggestionId}/reject`,
    { method: "POST" },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiMessage(
        response,
        "Não foi possível rejeitar a sugestão.",
      ),
    };
  revalidatePath("/app/replanning");
  return { success: "Sugestão rejeitada. Seu planejamento não foi alterado." };
}

export async function requestSuggestion(
  overdueBlockId: string,
  _state: ReplanningState,
): Promise<ReplanningState> {
  void _state;
  const response = await authenticatedApi(
    `study-blocks/${overdueBlockId}/replanning-suggestions`,
    { method: "POST" },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiMessage(
        response,
        "Não foi possível criar outra sugestão.",
      ),
    };
  revalidatePath("/app/replanning");
  return { success: "Uma nova sugestão foi calculada." };
}
