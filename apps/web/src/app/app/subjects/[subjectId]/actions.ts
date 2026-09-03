"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

export type ContentFormState = {
  message?: string;
  errors?: { name?: string; priority?: string; estimatedMinutes?: string };
};

export async function createContent(
  subjectId: string,
  _state: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = Number(formData.get("priority"));
  const estimateText = String(formData.get("estimatedMinutes") ?? "").trim();
  const estimatedMinutes = estimateText ? Number(estimateText) : undefined;
  const errors: NonNullable<ContentFormState["errors"]> = {};
  if (name.length < 2) errors.name = "Informe o nome do conteúdo.";
  if (!Number.isInteger(priority) || priority < 1 || priority > 5)
    errors.priority = "Escolha uma prioridade entre 1 e 5.";
  if (
    estimatedMinutes !== undefined &&
    (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0)
  ) {
    errors.estimatedMinutes = "Informe uma quantidade inteira de minutos.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  const response = await authenticatedApi(`subjects/${subjectId}/contents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      description: description || undefined,
      priority,
      estimatedDurationSeconds:
        estimatedMinutes === undefined ? undefined : estimatedMinutes * 60,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return { message: "Não foi possível cadastrar o conteúdo." };
  revalidatePath(`/app/subjects/${subjectId}`);
  return {};
}
