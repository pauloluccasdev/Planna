"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../../_lib/api";

export type EventFormState = { message?: string; success?: string };

function brazilInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-03:00`
    : null;
}

export async function createAcademicEvent(
  subjectId: string,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = brazilInstant(String(formData.get("startsAt") ?? ""));
  const rawEndsAt = String(formData.get("endsAt") ?? "");
  const endsAt = rawEndsAt ? brazilInstant(rawEndsAt) : null;
  const eventTypeId = String(formData.get("eventTypeId") ?? "");
  const contentsStatus = String(formData.get("contentsStatus") ?? "");
  const contentIds =
    contentsStatus === "INFORMED"
      ? formData.getAll("contentIds").map(String)
      : [];

  if (!title || !startsAt || !eventTypeId)
    return { message: "Preencha o tipo, o título e a data do evento." };
  if (rawEndsAt && !endsAt)
    return { message: "Informe um horário final válido." };
  if (endsAt && new Date(startsAt) >= new Date(endsAt))
    return { message: "O término deve ser posterior ao início." };
  if (contentsStatus === "INFORMED" && contentIds.length === 0)
    return { message: "Selecione ao menos um conteúdo cobrado." };

  const response = await authenticatedApi("academic-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      subjectId,
      eventTypeId,
      title,
      description: String(formData.get("description") ?? "").trim(),
      startsAt,
      ...(endsAt ? { endsAt } : {}),
      contentsStatus,
      contentIds,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message:
        payload?.error?.message ?? "Não foi possível cadastrar o evento.",
    };
  }
  const payload = (await response.json()) as { warnings?: unknown[] };
  revalidatePath(`/app/subjects/${subjectId}/events`);
  revalidatePath("/app");
  return {
    success: payload.warnings?.length
      ? "Evento salvo. O Planna identificou um conflito de horário na agenda."
      : "Evento salvo na agenda.",
  };
}

export async function createEventType(
  subjectId: string,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { message: "Informe o nome do novo tipo." };
  const response = await authenticatedApi("academic-event-types", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) return { message: "Não foi possível criar este tipo." };
  revalidatePath(`/app/subjects/${subjectId}/events`);
  return { success: "Tipo personalizado criado." };
}

export async function updateAcademicEvent(
  subjectId: string,
  eventId: string,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = brazilInstant(String(formData.get("startsAt") ?? ""));
  const rawEndsAt = String(formData.get("endsAt") ?? "");
  const endsAt = rawEndsAt ? brazilInstant(rawEndsAt) : null;
  const eventTypeId = String(formData.get("eventTypeId") ?? "");
  const contentsStatus = String(formData.get("contentsStatus") ?? "");
  const contentIds =
    contentsStatus === "INFORMED"
      ? formData.getAll("contentIds").map(String)
      : [];
  if (!title || !startsAt || !eventTypeId)
    return { message: "Preencha o tipo, o título e a data do evento." };
  if (rawEndsAt && !endsAt)
    return { message: "Informe um horário final válido." };
  if (endsAt && new Date(startsAt) >= new Date(endsAt))
    return { message: "O término deve ser posterior ao início." };
  if (contentsStatus === "INFORMED" && contentIds.length === 0)
    return { message: "Selecione ao menos um conteúdo cobrado." };

  const response = await authenticatedApi(`academic-events/${eventId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventTypeId,
      title,
      description: String(formData.get("description") ?? "").trim(),
      startsAt,
      endsAt,
      contentsStatus,
      contentIds,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message:
        payload?.error?.message ?? "Não foi possível atualizar o evento.",
    };
  }
  const payload = (await response.json()) as { warnings?: unknown[] };
  revalidatePath(`/app/subjects/${subjectId}/events`);
  revalidatePath("/app");
  return {
    success: payload.warnings?.length
      ? "Evento atualizado com alerta de conflito na agenda."
      : "Evento atualizado.",
  };
}

export async function removeAcademicEvent(subjectId: string, eventId: string) {
  const response = await authenticatedApi(`academic-events/${eventId}`, {
    method: "DELETE",
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("Não foi possível remover o evento.");
  revalidatePath(`/app/subjects/${subjectId}/events`);
  revalidatePath("/app");
}
