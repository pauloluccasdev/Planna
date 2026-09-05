"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export type CourseFormState = {
  message?: string;
  nameError?: string;
  success?: string;
};

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
