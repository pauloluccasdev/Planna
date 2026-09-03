"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

export type StudyFormState = { message?: string };

function brazilInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-03:00`
    : null;
}

export async function startUnplannedStudy(
  _state: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const contentId = String(formData.get("contentId") ?? "");
  if (!contentId) return { message: "Selecione o conteúdo estudado." };
  const response = await authenticatedApi("study-sessions/unplanned/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contentId,
      note: String(formData.get("note") ?? "").trim(),
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return { message: body?.error?.message ?? "Não foi possível iniciar." };
  }
  const session = ((await response.json()) as { data: { id: string } }).data;
  revalidatePath("/app");
  redirect(`/app/session?id=${session.id}`);
}

export async function registerRetroactiveStudy(
  _state: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const contentId = String(formData.get("contentId") ?? "");
  const startedAt = brazilInstant(String(formData.get("startedAt") ?? ""));
  const endedAt = brazilInstant(String(formData.get("endedAt") ?? ""));
  const breakMinutes = Number(formData.get("breakMinutes") ?? 0);
  if (!contentId || !startedAt || !endedAt)
    return { message: "Selecione o conteúdo e informe início e término." };
  if (new Date(startedAt) >= new Date(endedAt))
    return { message: "O término deve ser posterior ao início." };
  if (new Date(endedAt) > new Date())
    return { message: "O registro retroativo não pode terminar no futuro." };
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0)
    return { message: "Informe um tempo de pausa válido." };

  const response = await authenticatedApi("study-sessions/retroactive", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contentId,
      startedAt,
      endedAt,
      pomodoroBreakDurationSeconds: breakMinutes * 60,
      completedPartIds: formData.getAll("completedPartIds").map(String),
      note: String(formData.get("note") ?? "").trim(),
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message:
        body?.error?.message ?? "Não foi possível registrar este estudo.",
    };
  }
  revalidatePath("/app");
  redirect("/app");
}
