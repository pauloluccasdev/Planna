"use server";

import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../../../_lib/api";

export type BlockFormState = {
  message?: string;
  success?: string;
  canExpandAvailability?: boolean;
  errors?: { startsAt?: string; endsAt?: string; pomodoro?: string };
};

function brazilInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00-03:00`
    : null;
}

export async function createStudyBlock(
  contentId: string,
  _state: BlockFormState,
  formData: FormData,
): Promise<BlockFormState> {
  const startsAt = brazilInstant(String(formData.get("startsAt") ?? ""));
  const endsAt = brazilInstant(String(formData.get("endsAt") ?? ""));
  const focusMinutes = Number(formData.get("focusMinutes"));
  const breakMinutes = Number(formData.get("breakMinutes"));
  const repeatDaily = formData.get("repeatDaily") === "on";
  const repeatUntil = String(formData.get("repeatUntil") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const errors: NonNullable<BlockFormState["errors"]> = {};
  if (!startsAt) errors.startsAt = "Informe o início do bloco.";
  if (!endsAt) errors.endsAt = "Informe o término do bloco.";
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt))
    errors.endsAt = "O término deve ser posterior ao início.";
  if (
    !Number.isInteger(focusMinutes) ||
    focusMinutes <= 0 ||
    !Number.isInteger(breakMinutes) ||
    breakMinutes <= 0
  ) {
    errors.pomodoro = "Informe tempos inteiros e maiores que zero.";
  }
  if (repeatDaily && !/^\d{4}-\d{2}-\d{2}$/.test(repeatUntil))
    errors.endsAt = "Informe até quando o bloco deve se repetir.";
  if (repeatDaily && startsAt && repeatUntil < startsAt.slice(0, 10))
    errors.endsAt = "A repetição não pode terminar antes do primeiro bloco.";
  if (Object.keys(errors).length > 0) return { errors };
  if (!startsAt || !endsAt) return { errors };

  if (formData.get("intent") === "expandAvailability") {
    if (startsAt.slice(0, 10) !== endsAt.slice(0, 10)) {
      return {
        message:
          "A disponibilidade semanal não aceita um intervalo que atravesse a meia-noite.",
      };
    }
    const dates = repeatDaily
      ? calendarDatesBetween(startsAt.slice(0, 10), repeatUntil)
      : [startsAt.slice(0, 10)];
    const weekdays = [...new Set(dates.map(calendarWeekday))];
    const response = await authenticatedApi("availability/expand", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        intervals: weekdays.map((weekday) => ({
          weekday,
          startLocalTime: startsAt.slice(11, 16),
          endLocalTime: endsAt.slice(11, 16),
        })),
      }),
    });
    if (!response || response.status === 401) redirect("/login");
    if (!response.ok) {
      return {
        message:
          "Não foi possível ampliar a disponibilidade. Revise sua grade semanal.",
        canExpandAvailability: true,
      };
    }
    return {
      success:
        weekdays.length === 1
          ? "Horário adicionado à disponibilidade. Confirme novamente para criar o bloco."
          : `Horário adicionado em ${weekdays.length} dias da semana. Confirme novamente para criar os blocos.`,
    };
  }

  const response = await authenticatedApi(
    repeatDaily ? "study-blocks/recurring/daily" : "study-blocks",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contentId,
        startsAt,
        endsAt,
        partIds: formData.getAll("partIds").map(String),
        focusSeconds: focusMinutes * 60,
        breakSeconds: breakMinutes * 60,
        ...(repeatDaily ? { repeatUntil } : {}),
      }),
    },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;
    const messages: Record<string, string> = {
      BLOCK_OUTSIDE_AVAILABILITY:
        "Este horário está fora da sua disponibilidade semanal.",
      STUDY_BLOCK_CONFLICT: "Já existe um bloco nesse horário.",
      ACADEMIC_EVENT_CONFLICT: "Existe um compromisso acadêmico nesse horário.",
      RECURRENCE_OUTSIDE_AVAILABILITY:
        "Uma das ocorrências está fora da sua disponibilidade semanal.",
      RECURRENCE_TOO_LONG: "A repetição ultrapassa o limite de 366 blocos.",
    };
    return {
      message:
        messages[body?.error?.code ?? ""] ??
        "Não foi possível criar o bloco. Revise os horários.",
      canExpandAvailability: [
        "BLOCK_OUTSIDE_AVAILABILITY",
        "RECURRENCE_OUTSIDE_AVAILABILITY",
      ].includes(body?.error?.code ?? ""),
    };
  }
  redirect("/app");
}

function calendarDatesBetween(first: string, last: string) {
  const dates: string[] = [];
  const cursor = new Date(`${first}T00:00:00.000Z`);
  const limit = new Date(`${last}T00:00:00.000Z`);
  while (cursor <= limit && dates.length <= 366) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function calendarWeekday(value: string) {
  return new Date(`${value}T00:00:00.000Z`).getUTCDay();
}
