"use client";

import { useActionState } from "react";
import {
  type AdminActionState,
  changeAccountStatus,
  requestAccountRecovery,
} from "./actions";

const initialState: AdminActionState = {};

export function AccountActions({
  userId,
  status,
  isCurrentUser,
}: {
  userId: string;
  status: "ACTIVE" | "BLOCKED";
  isCurrentUser: boolean;
}) {
  const statusAction = changeAccountStatus.bind(
    null,
    userId,
    status === "ACTIVE" ? "block" : "unblock",
  );
  const recoveryAction = requestAccountRecovery.bind(null, userId);
  const [statusState, submitStatus, statusPending] = useActionState(
    statusAction,
    initialState,
  );
  const [recoveryState, submitRecovery, recoveryPending] = useActionState(
    recoveryAction,
    initialState,
  );

  return (
    <div className="admin-account-actions">
      <form
        action={submitStatus}
        onSubmit={(event) => {
          if (
            status === "ACTIVE" &&
            !window.confirm(
              "Bloquear esta conta impedirá novos acessos e invalidará o uso da sessão atual. Deseja continuar?",
            )
          )
            event.preventDefault();
        }}
      >
        <button
          className="secondary-button"
          disabled={statusPending || (isCurrentUser && status === "ACTIVE")}
          type="submit"
        >
          {statusPending
            ? "Salvando…"
            : status === "ACTIVE"
              ? "Bloquear"
              : "Desbloquear"}
        </button>
      </form>
      <form action={submitRecovery}>
        <button
          className="secondary-button"
          disabled={recoveryPending}
          type="submit"
        >
          {recoveryPending ? "Enviando…" : "Enviar recuperação"}
        </button>
      </form>
      {statusState.message || recoveryState.message ? (
        <p className="form-error" role="alert">
          {statusState.message ?? recoveryState.message}
        </p>
      ) : null}
      {statusState.success || recoveryState.success ? (
        <p className="form-success" role="status">
          {statusState.success ?? recoveryState.success}
        </p>
      ) : null}
    </div>
  );
}
