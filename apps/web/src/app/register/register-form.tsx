"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type RegisterState } from "./actions";

const initialState: RegisterState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState);
  if (state.success) {
    return (
      <div className="registration-success" role="status">
        <span aria-hidden="true">✓</span>
        <h2>Sua conta foi criada.</h2>
        <p>{state.success}</p>
        <Link className="button" href="/login">
          Ir para o login
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="login-form registration-form">
      <div className="field">
        <label htmlFor="register-username">Nome de usuário</label>
        <input
          autoComplete="username"
          id="register-username"
          maxLength={40}
          minLength={3}
          name="username"
          required
          aria-describedby={
            state.errors?.username ? "register-username-error" : undefined
          }
        />
        {state.errors?.username ? (
          <span className="field-error" id="register-username-error">
            {state.errors.username}
          </span>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="register-email">E-mail</label>
        <input
          autoComplete="email"
          id="register-email"
          maxLength={320}
          name="email"
          type="email"
          required
          aria-describedby={
            state.errors?.email ? "register-email-error" : undefined
          }
        />
        <small>Usaremos este endereço para confirmação e recuperação.</small>
        {state.errors?.email ? (
          <span className="field-error" id="register-email-error">
            {state.errors.email}
          </span>
        ) : null}
      </div>
      <div className="form-columns">
        <div className="field">
          <label htmlFor="register-password">Senha</label>
          <input
            autoComplete="new-password"
            id="register-password"
            maxLength={128}
            minLength={8}
            name="password"
            type="password"
            required
            aria-describedby={
              state.errors?.password ? "register-password-error" : undefined
            }
          />
          {state.errors?.password ? (
            <span className="field-error" id="register-password-error">
              {state.errors.password}
            </span>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="register-password-confirmation">
            Confirmar senha
          </label>
          <input
            autoComplete="new-password"
            id="register-password-confirmation"
            maxLength={128}
            minLength={8}
            name="passwordConfirmation"
            type="password"
            required
            aria-describedby={
              state.errors?.passwordConfirmation
                ? "register-password-confirmation-error"
                : undefined
            }
          />
          {state.errors?.passwordConfirmation ? (
            <span
              className="field-error"
              id="register-password-confirmation-error"
            >
              {state.errors.passwordConfirmation}
            </span>
          ) : null}
        </div>
      </div>
      {state.message ? (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="button login-submit" disabled={pending} type="submit">
        {pending ? "Criando conta…" : "Criar minha conta"}
      </button>
      <p className="auth-switch">
        Já possui uma conta? <Link href="/login">Entrar</Link>
      </p>
    </form>
  );
}
