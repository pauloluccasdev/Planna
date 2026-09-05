"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export type PlanningFormState = { message?: string };

function nextCivilDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function apiError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return payload?.error?.message ?? fallback;
}

export async function generatePlanningProposal(
  _state: PlanningFormState,
  formData: FormData,
): Promise<PlanningFormState> {
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const courseIds = formData.getAll("courseIds").map(String);
  const subjectIds = formData.getAll("subjectIds").map(String);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    return { message: "Informe a data inicial." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    return { message: "Informe a data final." };
  if (endDate < startDate)
    return { message: "A data final deve ser igual ou posterior à inicial." };
  if (courseIds.length === 0 && subjectIds.length === 0)
    return { message: "Selecione ao menos um curso ou uma disciplina." };

  const response = await authenticatedApi("planning-proposals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      periodStart: `${startDate}T00:00:00-03:00`,
      periodEnd: `${nextCivilDate(endDate)}T00:00:00-03:00`,
      courseIds,
      subjectIds,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiError(
        response,
        "Não foi possível gerar o planejamento.",
      ),
    };
  const { data } = (await response.json()) as { data: { id: string } };
  redirect(`/app/planning/${data.id}`);
}

export async function confirmPlanningProposal(
  proposalId: string,
  _state: PlanningFormState,
  formData: FormData,
): Promise<PlanningFormState> {
  if (formData.get("confirmation") !== "confirmed")
    return { message: "Confirme que deseja adicionar os blocos à agenda." };
  const response = await authenticatedApi(
    `planning-proposals/${proposalId}/confirm`,
    { method: "POST" },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiError(
        response,
        "Não foi possível confirmar o planejamento.",
      ),
    };
  revalidatePath("/app");
  redirect("/app");
}

export async function discardPlanningProposal(
  proposalId: string,
  _state: PlanningFormState,
): Promise<PlanningFormState> {
  void _state;
  const response = await authenticatedApi(
    `planning-proposals/${proposalId}/discard`,
    { method: "POST" },
  );
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return {
      message: await apiError(
        response,
        "Não foi possível descartar a proposta.",
      ),
    };
  redirect("/app");
}
