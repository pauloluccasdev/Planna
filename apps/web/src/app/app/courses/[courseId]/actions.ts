"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

export type SubjectFormState = {
  message?: string;
  nameError?: string;
  success?: string;
};
export type PeriodFormState = { message?: string; success?: string };

export async function createSubject(
  courseId: string,
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const academicPeriodId = String(formData.get("academicPeriodId") ?? "");
  if (name.length < 2) return { nameError: "Informe o nome da disciplina." };
  if (name.length > 160) return { nameError: "Use no máximo 160 caracteres." };
  const response = await authenticatedApi(`courses/${courseId}/subjects`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      ...(academicPeriodId ? { academicPeriodId } : {}),
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return { message: "Não foi possível cadastrar a disciplina." };
  revalidatePath(`/app/courses/${courseId}`);
  revalidatePath("/app/courses");
  return { success: "Disciplina adicionada." };
}

export async function createAcademicPeriod(
  courseId: string,
  _state: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const startsOn = String(formData.get("startsOn") ?? "");
  const endsOn = String(formData.get("endsOn") ?? "");
  if (name.length < 2) return { message: "Informe o nome do período." };
  if (startsOn && endsOn && startsOn > endsOn)
    return { message: "A data final deve ser posterior à inicial." };
  const response = await authenticatedApi(`courses/${courseId}/periods`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      ...(startsOn ? { startsOn } : {}),
      ...(endsOn ? { endsOn } : {}),
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok)
    return { message: "Não foi possível criar o período letivo." };
  revalidatePath(`/app/courses/${courseId}`);
  return { success: "Período letivo criado." };
}

export async function updateSubject(
  courseId: string,
  subjectId: string,
  _state: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const academicPeriodId = String(formData.get("academicPeriodId") ?? "");
  if (name.length < 2) return { nameError: "Informe o nome da disciplina." };
  if (name.length > 160) return { nameError: "Use no máximo 160 caracteres." };
  if (description.length > 2000)
    return { message: "Use no máximo 2.000 caracteres na descrição." };

  const response = await authenticatedApi(`subjects/${subjectId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      description,
      academicPeriodId: academicPeriodId || null,
    }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message:
        payload?.error?.message ?? "Não foi possível atualizar a disciplina.",
    };
  }
  revalidatePath(`/app/courses/${courseId}`);
  revalidatePath(`/app/subjects/${subjectId}`);
  return { success: "Disciplina atualizada." };
}
