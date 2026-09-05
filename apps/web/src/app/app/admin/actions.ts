"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export type AdminActionState = { message?: string; success?: string };

export async function changeAccountStatus(
  userId: string,
  action: "block" | "unblock",
  _state: AdminActionState,
): Promise<AdminActionState> {
  void _state;
  const response = await authenticatedApi(`admin/users/${userId}/${action}`, {
    method: "POST",
  });
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 403)
    return { message: "Seu perfil não possui acesso administrativo." };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message: body?.error?.message ?? "Não foi possível alterar esta conta.",
    };
  }
  revalidatePath("/app/admin");
  return {
    success: action === "block" ? "Conta bloqueada." : "Conta desbloqueada.",
  };
}

export async function requestAccountRecovery(
  userId: string,
  _state: AdminActionState,
): Promise<AdminActionState> {
  void _state;
  const response = await authenticatedApi(
    `admin/users/${userId}/password-recovery`,
    { method: "POST" },
  );
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 403)
    return { message: "Seu perfil não possui acesso administrativo." };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message: body?.error?.message ?? "Não foi possível enviar a recuperação.",
    };
  }
  return { success: "Instruções de recuperação enviadas ao e-mail da conta." };
}
