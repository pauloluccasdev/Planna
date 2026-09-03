"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authenticatedApi } from "../../_lib/api";

type ApiError = { error?: { message?: string } };

async function mutate<T>(path: string, body?: unknown) {
  const response = await authenticatedApi(path, {
    method: "POST",
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiError | null;
    throw new Error(
      payload?.error?.message ?? "Não foi possível atualizar a sessão.",
    );
  }
  return (await response.json()) as { data: T };
}

export async function startStudySession(blockId: string) {
  const result = await mutate<{ id: string }>(
    `study-blocks/${blockId}/sessions/start`,
  );
  revalidatePath("/app");
  revalidatePath("/app/session");
  redirect(`/app/session?id=${result.data.id}`);
}

export async function pauseStudySession(sessionId: string) {
  const result = await mutate<SessionMutation>(
    `study-sessions/${sessionId}/pause`,
  );
  revalidatePath("/app/session");
  return result.data;
}

export async function resumeStudySession(sessionId: string) {
  const result = await mutate<SessionMutation>(
    `study-sessions/${sessionId}/resume`,
  );
  revalidatePath("/app/session");
  return result.data;
}

export async function startPomodoroBreak(sessionId: string) {
  const result = await mutate<SessionMutation>(
    `study-sessions/${sessionId}/pomodoro-break`,
  );
  revalidatePath("/app/session");
  return result.data;
}

export async function resumeFocus(sessionId: string) {
  const result = await mutate<SessionMutation>(
    `study-sessions/${sessionId}/focus`,
  );
  revalidatePath("/app/session");
  return result.data;
}

export async function completeStudySession(
  sessionId: string,
  formData: FormData,
) {
  await mutate<{ id: string }>(`study-sessions/${sessionId}/complete`, {
    completedPartIds: formData.getAll("completedPartIds").map(String),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/app");
  revalidatePath("/app/session");
  redirect("/app");
}

type SessionMutation = {
  status: string;
  segments: Array<{
    kind: "FOCUS" | "POMODORO_BREAK";
    startedAt: string;
    endedAt: string | null;
  }>;
};
