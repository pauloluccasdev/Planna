"use client";

import { useActionState } from "react";
import {
  confirmPlanningProposal,
  discardPlanningProposal,
  type PlanningFormState,
} from "../actions";

const initialState: PlanningFormState = {};

export function ProposalActions({ proposalId }: { proposalId: string }) {
  const [confirmState, confirmAction, confirming] = useActionState(
    confirmPlanningProposal.bind(null, proposalId),
    initialState,
  );
  const [discardState, discardAction, discarding] = useActionState(
    discardPlanningProposal.bind(null, proposalId),
    initialState,
  );
  return (
    <div className="proposal-decision">
      <form action={confirmAction} className="proposal-confirm-form">
        <label className="check-row confirmation-check">
          <input name="confirmation" type="checkbox" value="confirmed" />
          <span>
            Revisei a proposta e quero adicionar estes blocos à minha agenda.
          </span>
        </label>
        {confirmState.message ? (
          <p className="form-message" role="alert">
            {confirmState.message}
          </p>
        ) : null}
        <button className="button" disabled={confirming || discarding}>
          {confirming ? "Confirmando…" : "Confirmar planejamento"}
        </button>
      </form>
      <form action={discardAction}>
        {discardState.message ? (
          <p className="form-message" role="alert">
            {discardState.message}
          </p>
        ) : null}
        <button
          className="secondary-button"
          disabled={confirming || discarding}
          type="submit"
        >
          {discarding ? "Descartando…" : "Descartar proposta"}
        </button>
      </form>
    </div>
  );
}
