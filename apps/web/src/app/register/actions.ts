"use server";

import { apiUrl } from "../_lib/api";

export type RegisterState = {
  message?: string;
  success?: string;
  errors?: {
    username?: string;
    email?: string;
    password?: string;
    passwordConfirmation?: string;
  };
};

export async function register(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  );
  const errors: NonNullable<RegisterState["errors"]> = {};
  if (!/^[\p{L}\p{N}._-]{3,40}$/u.test(username))
    errors.username =
      "Use de 3 a 40 letras, números, pontos, hífens ou sublinhados.";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Informe um e-mail válido.";
  if (password.length < 8) errors.password = "Use pelo menos 8 caracteres.";
  if (password.length > 128) errors.password = "Use no máximo 128 caracteres.";
  if (passwordConfirmation !== password)
    errors.passwordConfirmation = "As senhas não coincidem.";
  if (Object.keys(errors).length > 0) return { errors };

  let response: Response;
  try {
    response = await fetch(apiUrl("auth/register"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, email, password }),
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
        payload?.error?.message ?? "Não foi possível criar a conta agora.",
    };
  }
  const payload = (await response.json()) as {
    data: { emailVerificationRequired: boolean };
  };
  return {
    success: payload.data.emailVerificationRequired
      ? "Conta criada. Verifique seu e-mail antes de entrar."
      : "Conta criada. Você já pode entrar no Planna.",
  };
}
