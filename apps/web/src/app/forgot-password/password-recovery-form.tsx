"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordRecovery, type PasswordRecoveryState } from "./actions";

const initialState: PasswordRecoveryState = {};

export function PasswordRecoveryForm() {
  const [state, action, pending] = useActionState(
    requestPasswordRecovery,
    initialState,
  );
  if (state.success) {
    return (
      <div className="registration-success" role="status">
        <span aria-hidden="true">✓</span>
        <h2>Confira seu e-mail.</h2>
        <p>{state.success}</p>
        <Link className="button" href="/login">
          Voltar ao login
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="login-form">
      <div className="field">
        <label htmlFor="recovery-email">E-mail da conta</label>
        <input
          autoComplete="email"
          id="recovery-email"
          maxLength={320}
          name="email"
          type="email"
          required
          aria-describedby={
            state.errors?.email ? "recovery-email-error" : undefined
          }
        />
        {state.errors?.email ? (
          <span className="field-error" id="recovery-email-error">
            {state.errors.email}
          </span>
        ) : null}
      </div>
      <button className="button login-submit" disabled={pending} type="submit">
        {pending ? "Solicitando…" : "Enviar instruções"}
      </button>
      <p className="auth-switch">
        Lembrou sua senha? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
