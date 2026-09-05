"use server";

import { apiUrl } from "../_lib/api";

export type PasswordRecoveryState = {
  success?: string;
  errors?: { email?: string };
};

const neutralMessage =
  "Se existir uma conta com esse e-mail e o envio estiver disponível, você receberá as instruções de recuperação.";

export async function requestPasswordRecovery(
  _state: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) {
    return { errors: { email: "Informe um e-mail válido." } };
  }

  try {
    await fetch(apiUrl("auth/password-recovery"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch {
    // A resposta permanece neutra para não expor contas nem o provedor de e-mail.
  }

  return { success: neutralMessage };
}
