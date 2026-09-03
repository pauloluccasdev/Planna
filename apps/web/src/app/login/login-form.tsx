"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="login-form">
      <div className="field">
        <label htmlFor="username">Nome de usuário</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          minLength={3}
          required
          aria-describedby={
            state.errors?.username ? "username-error" : undefined
          }
        />
        {state.errors?.username && (
          <span className="field-error" id="username-error">
            {state.errors.username}
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          aria-describedby={
            state.errors?.password ? "password-error" : undefined
          }
        />
        {state.errors?.password && (
          <span className="field-error" id="password-error">
            {state.errors.password}
          </span>
        )}
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button login-submit" disabled={pending} type="submit">
        {pending ? "Entrando…" : "Entrar no Planna"}
      </button>
    </form>
  );
}
