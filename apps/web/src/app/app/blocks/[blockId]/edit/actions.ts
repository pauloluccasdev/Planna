"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../../_lib/api";

export type BlockEditState = {
  message?: string;
  errors?: {
    contentId?: string;
    startsAt?: string;
    endsAt?: string;
    pomodoro?: string;
  };
};

function brazilInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-03:00`
    : null;
}

export async function updateStudyBlock(
  blockId: string,
  revision: number,
  _state: BlockEditState,
  formData: FormData,
): Promise<BlockEditState> {
  const contentId = String(formData.get("contentId") ?? "");
  const startsAt = brazilInstant(String(formData.get("startsAt") ?? ""));
  const endsAt = brazilInstant(String(formData.get("endsAt") ?? ""));
  const focusMinutes = Number(formData.get("focusMinutes"));
  const breakMinutes = Number(formData.get("breakMinutes"));
  const errors: NonNullable<BlockEditState["errors"]> = {};
  if (!contentId) errors.contentId = "Selecione um conteúdo.";
  if (!startsAt) errors.startsAt = "Informe o início do bloco.";
  if (!endsAt) errors.endsAt = "Informe o término do bloco.";
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt))
    errors.endsAt = "O término deve ser posterior ao início.";
  if (startsAt && new Date(startsAt) <= new Date())
    errors.startsAt = "O bloco editado deve continuar no futuro.";
  if (
    !Number.isInteger(focusMinutes) ||
    focusMinutes < 1 ||
    focusMinutes > 240 ||
    !Number.isInteger(breakMinutes) ||
    breakMinutes < 1 ||
    breakMinutes > 60
  ) {
    errors.pomodoro =
      "Use foco entre 1 e 240 minutos e pausa entre 1 e 60 minutos.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  const response = await authenticatedApi(`study-blocks/${blockId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      revision,
      contentId,
      startsAt,
      endsAt,
      focusSeconds: focusMinutes * 60,
      breakSeconds: breakMinutes * 60,
      partIds: formData.getAll("partIds").map(String),
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    const messages: Record<string, string> = {
      RESOURCE_VERSION_CONFLICT:
        "Este bloco foi alterado em outra tela. Recarregue antes de continuar.",
      STUDY_BLOCK_NOT_EDITABLE:
        "Este bloco não pode mais ser editado porque já começou ou mudou de estado.",
      BLOCK_OUTSIDE_AVAILABILITY:
        "O novo horário está fora da sua disponibilidade semanal.",
      STUDY_BLOCK_CONFLICT: "Já existe outro bloco nesse horário.",
      ACADEMIC_EVENT_CONFLICT:
        "Existe um compromisso acadêmico que ocupa esse horário.",
      INVALID_STUDY_BLOCK_PARTS:
        "As partes selecionadas não pertencem ao conteúdo escolhido.",
    };
    return {
      message:
        messages[payload?.error?.code ?? ""] ??
        payload?.error?.message ??
        "Não foi possível atualizar o bloco.",
    };
  }
  revalidatePath("/app");
  revalidatePath(`/app/blocks/${blockId}/edit`);
  redirect("/app");
}
