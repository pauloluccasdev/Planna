"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

export type SubjectFormState = { message?: string; nameError?: string };

export async function createSubject(
  courseId: string,
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { nameError: "Informe o nome da disciplina." };
  if (name.length > 160) return { nameError: "Use no máximo 160 caracteres." };
  const response = await authenticatedApi(`courses/${courseId}/subjects`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return { message: "Não foi possível cadastrar a disciplina." };
  revalidatePath(`/app/courses/${courseId}`);
  revalidatePath("/app/courses");
  return {};
}
