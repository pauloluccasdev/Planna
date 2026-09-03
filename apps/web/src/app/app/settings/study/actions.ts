"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

export type SettingsState = { message?: string; success?: string };

export async function saveAvailability(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const weekdays = formData.getAll("weekday").map(Number);
  const starts = formData.getAll("startLocalTime").map(String);
  const ends = formData.getAll("endLocalTime").map(String);
  if (weekdays.length !== starts.length || starts.length !== ends.length) {
    return { message: "Os intervalos enviados são inválidos." };
  }
  const intervals = weekdays.map((weekday, index) => ({
    weekday,
    startLocalTime: starts[index],
    endLocalTime: ends[index],
  }));
  const response = await authenticatedApi("availability", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intervals }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    return {
      message:
        response.status === 409
          ? "A alteração deixaria blocos futuros fora da disponibilidade."
          : "Revise os intervalos: eles não podem se sobrepor.",
    };
  }
  revalidatePath("/app/settings/study");
  return { success: "Disponibilidade atualizada." };
}

export async function savePomodoro(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const focusMinutes = Number(formData.get("focusMinutes"));
  const breakMinutes = Number(formData.get("breakMinutes"));
  if (
    !Number.isInteger(focusMinutes) ||
    focusMinutes <= 0 ||
    !Number.isInteger(breakMinutes) ||
    breakMinutes <= 0
  ) {
    return { message: "Informe tempos inteiros e maiores que zero." };
  }
  const response = await authenticatedApi("pomodoro-preference", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      focusSeconds: focusMinutes * 60,
      breakSeconds: breakMinutes * 60,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) return { message: "Não foi possível salvar o Pomodoro." };
  revalidatePath("/app/settings/study");
  return { success: "Pomodoro padrão atualizado." };
}
