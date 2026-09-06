"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export type CourseFormState = {
  message?: string;
  nameError?: string;
  success?: string;
};
export type DeleteResourceState = { message?: string };

async function deletionError(response: Response, resource: string) {
  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  if (payload?.error?.code === "ENTITY_HAS_HISTORY")
    return `Este ${resource} possui histórico e não pode ser excluído definitivamente.`;
  return (
    payload?.error?.message ?? `Não foi possível excluir este ${resource}.`
  );
}

export async function createCourse(
  _state: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { nameError: "Informe o nome do curso." };
  if (name.length > 160) return { nameError: "Use no máximo 160 caracteres." };

  const response = await authenticatedApi("courses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    return { message: "Não foi possível cadastrar o curso." };
  }
  revalidatePath("/app/courses");
  revalidatePath("/app");
  return {};
}

export async function updateCourse(
  courseId: string,
  _state: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (name.length < 2) return { nameError: "Informe o nome do curso." };
  if (name.length > 160) return { nameError: "Use no máximo 160 caracteres." };
  if (description.length > 2000)
    return { message: "Use no máximo 2.000 caracteres na descrição." };

  const response = await authenticatedApi(`courses/${courseId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message: payload?.error?.message ?? "Não foi possível atualizar o curso.",
    };
  }
  revalidatePath("/app/courses");
  revalidatePath(`/app/courses/${courseId}`);
  revalidatePath("/app");
  return { success: "Curso atualizado." };
}

export async function deleteCourse(
  courseId: string,
  _state: DeleteResourceState,
  _formData: FormData,
): Promise<DeleteResourceState> {
  void _state;
  void _formData;
  const response = await authenticatedApi(`courses/${courseId}`, {
    method: "DELETE",
  });
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) return { message: await deletionError(response, "curso") };
  revalidatePath("/app/courses");
  revalidatePath("/app");
  redirect("/app/courses");
}
