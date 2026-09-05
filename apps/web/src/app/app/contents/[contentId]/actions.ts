"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

export type PartFormState = {
  message?: string;
  errors?: { name?: string };
};

export type ContentEditState = {
  message?: string;
  errors?: {
    name?: string;
    priority?: string;
    estimatedMinutes?: string;
  };
};

export async function updateContent(
  contentId: string,
  subjectId: string,
  _state: ContentEditState,
  formData: FormData,
): Promise<ContentEditState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = Number(formData.get("priority"));
  const estimateText = String(formData.get("estimatedMinutes") ?? "").trim();
  const estimatedMinutes = estimateText ? Number(estimateText) : null;
  const errors: NonNullable<ContentEditState["errors"]> = {};
  if (name.length < 2) errors.name = "Informe o nome do conteúdo.";
  if (name.length > 200) errors.name = "Use no máximo 200 caracteres.";
  if (!Number.isInteger(priority) || priority < 1 || priority > 5)
    errors.priority = "Selecione uma prioridade entre 1 e 5.";
  if (
    estimatedMinutes !== null &&
    (!Number.isInteger(estimatedMinutes) || estimatedMinutes <= 0)
  )
    errors.estimatedMinutes = "Use minutos inteiros maiores que zero.";
  if (Object.keys(errors).length) return { errors };

  const response = await authenticatedApi(`contents/${contentId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      description,
      priority,
      estimatedDurationSeconds:
        estimatedMinutes === null ? null : estimatedMinutes * 60,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return { message: "Não foi possível atualizar o conteúdo." };
  revalidatePath(`/app/contents/${contentId}`);
  revalidatePath(`/app/subjects/${subjectId}`);
  redirect(`/app/contents/${contentId}`);
}

export async function createPart(
  contentId: string,
  _state: PartFormState,
  formData: FormData,
): Promise<PartFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 2) return { errors: { name: "Informe o nome da parte." } };
  if (name.length > 200)
    return { errors: { name: "Use no máximo 200 caracteres." } };
  const response = await authenticatedApi(`contents/${contentId}/parts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, description: description || undefined }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) return { message: "Não foi possível cadastrar a parte." };
  revalidatePath(`/app/contents/${contentId}`);
  return {};
}

type Part = { id: string };

export async function movePart(
  contentId: string,
  partId: string,
  direction: "up" | "down",
) {
  const currentResponse = await authenticatedApi(`contents/${contentId}/parts`);
  if (!currentResponse || currentResponse.status === 401) redirect("/login");
  if (!currentResponse.ok) return;
  const parts = ((await currentResponse.json()) as { data: Part[] }).data;
  const index = parts.findIndex(({ id }) => id === partId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= parts.length) return;
  const ids = parts.map(({ id }) => id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  const response = await authenticatedApi(`contents/${contentId}/parts-order`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ partIds: ids }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (response.ok) {
    revalidatePath(`/app/contents/${contentId}`);
    refresh();
  }
}
