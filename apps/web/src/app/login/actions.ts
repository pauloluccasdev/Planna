"use server";

import { redirect } from "next/navigation";
import { apiUrl, saveSession } from "../_lib/api";

export type LoginState = {
  message?: string;
  errors?: { username?: string; password?: string };
};

type LoginResponse = {
  data?: {
    session?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
};

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const errors: LoginState["errors"] = {};
  if (username.length < 3) errors.username = "Informe seu nome de usuário.";
  if (password.length < 8) errors.password = "Informe sua senha.";
  if (Object.keys(errors).length > 0) return { errors };

  let response: Response;
  try {
    response = await fetch(apiUrl("auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    return {
      message: "Não foi possível acessar o Planna agora. Tente novamente.",
    };
  }
  if (!response.ok) {
    return {
      message:
        response.status === 401
          ? "Usuário ou senha inválidos."
          : "Não foi possível entrar. Tente novamente.",
    };
  }
  const body = (await response.json()) as LoginResponse;
  if (!body.data?.session) {
    return { message: "A resposta de autenticação foi inválida." };
  }
  await saveSession(body.data.session);
  redirect("/app");
}
