"use server";

import { apiUrl } from "../_lib/api";

export type PasswordResetState = {
  message?: string;
  success?: string;
  errors?: { password?: string; passwordConfirmation?: string };
};

export async function resetPassword(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const accessToken = String(formData.get("accessToken") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  );
  const errors: NonNullable<PasswordResetState["errors"]> = {};
  if (password.length < 8) errors.password = "Use pelo menos 8 caracteres.";
  if (password.length > 128) errors.password = "Use no máximo 128 caracteres.";
  if (passwordConfirmation !== password)
    errors.passwordConfirmation = "As senhas não coincidem.";
  if (Object.keys(errors).length > 0) return { errors };
  if (!accessToken || accessToken.length > 4096) {
    return { message: "Este link de recuperação é inválido ou expirou." };
  }

  let response: Response;
  try {
    response = await fetch(apiUrl("auth/password-reset"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
  } catch {
    return { message: "Não foi possível acessar o Planna agora." };
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return {
      message:
        response.status === 401
          ? "Este link de recuperação expirou ou já foi utilizado."
          : (payload?.error?.message ?? "Não foi possível alterar sua senha."),
    };
  }
  return { success: "Senha alterada. Entre novamente com sua nova senha." };
}
