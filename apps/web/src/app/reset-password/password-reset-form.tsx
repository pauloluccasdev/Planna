"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { PasswordInput } from "../_components/password-input";
import { resetPassword, type PasswordResetState } from "./actions";

const initialState: PasswordResetState = {};
const subscribeToLocation = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  queueMicrotask(notify);
  return () => window.removeEventListener("hashchange", notify);
};
const getServerToken = () => "";
const getRecoveryToken = () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  return fragment.get("type") === "recovery"
    ? (fragment.get("access_token") ?? "")
    : "";
};
const getClientReady = () => true;
const getServerReady = () => false;

export function PasswordResetForm() {
  const accessToken = useSyncExternalStore(
    subscribeToLocation,
    getRecoveryToken,
    getServerToken,
  );
  const clientReady = useSyncExternalStore(
    subscribeToLocation,
    getClientReady,
    getServerReady,
  );
  const linkError =
    clientReady && !accessToken
      ? "Este link de recuperação é inválido ou expirou."
      : "";
  const [state, action, pending] = useActionState(resetPassword, initialState);

  if (state.success) {
    return (
      <div className="registration-success" role="status">
        <span aria-hidden="true">✓</span>
        <h2>Senha alterada.</h2>
        <p>{state.success}</p>
        <Link className="button" href="/login">
          Entrar no Planna
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="login-form registration-form">
      <input name="accessToken" type="hidden" value={accessToken} />
      <div className="field">
        <label htmlFor="new-password">Nova senha</label>
        <PasswordInput
          autoComplete="new-password"
          id="new-password"
          maxLength={128}
          minLength={8}
          name="password"
          required
          aria-describedby={
            state.errors?.password ? "new-password-error" : undefined
          }
        />
        {state.errors?.password ? (
          <span className="field-error" id="new-password-error">
            {state.errors.password}
          </span>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="new-password-confirmation">Confirmar nova senha</label>
        <PasswordInput
          autoComplete="new-password"
          id="new-password-confirmation"
          maxLength={128}
          minLength={8}
          name="passwordConfirmation"
          required
          aria-describedby={
            state.errors?.passwordConfirmation
              ? "new-password-confirmation-error"
              : undefined
          }
        />
        {state.errors?.passwordConfirmation ? (
          <span className="field-error" id="new-password-confirmation-error">
            {state.errors.passwordConfirmation}
          </span>
        ) : null}
      </div>
      {linkError || state.message ? (
        <p className="form-message" role="alert">
          {linkError || state.message}
        </p>
      ) : null}
      <button
        className="button login-submit"
        disabled={pending || !accessToken}
        type="submit"
      >
        {pending ? "Alterando…" : "Alterar senha"}
      </button>
      {linkError ? (
        <p className="auth-switch">
          <Link href="/forgot-password">Solicitar outro link</Link>
        </p>
      ) : null}
    </form>
  );
}
