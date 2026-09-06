"use client";

import { useActionState } from "react";
import {
  acceptSuggestion,
  rejectSuggestion,
  requestSuggestion,
  updateSuggestion,
  type ReplanningState,
} from "./actions";

type Suggestion = {
  id: string;
  status: "GENERATED" | "EDITING" | "ACCEPTED" | "REJECTED";
  generationKind: "AUTOMATIC_FIRST" | "STUDENT_REQUESTED";
  suggestedStartsAt: string;
  suggestedEndsAt: string;
  suggestedDurationSeconds: number;
  revision: number;
  overdueBlock: {
    id: string;
    status: string;
    startsAt: string;
    content: {
      name: string;
      subject: { name: string; course: { name: string } };
    };
  };
};

const initialState: ReplanningState = {};
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function localInputValue(value: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours ? `${hours}h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes}min` : ""}`;
}

export function SuggestionCard({
  suggestion,
  acceptIdempotencyKey,
}: {
  suggestion: Suggestion;
  acceptIdempotencyKey: string;
}) {
  const open = ["GENERATED", "EDITING"].includes(suggestion.status);
  const [editState, editAction, editing] = useActionState(
    updateSuggestion.bind(null, suggestion.id, suggestion.revision),
    initialState,
  );
  const [acceptState, acceptAction, accepting] = useActionState(
    acceptSuggestion.bind(null, suggestion.id),
    initialState,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectSuggestion.bind(null, suggestion.id),
    initialState,
  );
  const [requestState, requestAction, requesting] = useActionState(
    requestSuggestion.bind(null, suggestion.overdueBlock.id),
    initialState,
  );
  const busy = editing || accepting || rejecting || requesting;

  return (
    <article className={`replanning-card ${open ? "is-open" : ""}`}>
      <div className="replanning-card-heading">
        <div>
          <span className="eyebrow">
            {open
              ? "Sugestão aguardando sua decisão"
              : suggestion.status === "ACCEPTED"
                ? "Sugestão aceita"
                : "Sugestão rejeitada"}
          </span>
          <h2>{suggestion.overdueBlock.content.name}</h2>
          <p>
            {suggestion.overdueBlock.content.subject.course.name} ·{" "}
            {suggestion.overdueBlock.content.subject.name}
          </p>
        </div>
        <strong>{duration(suggestion.suggestedDurationSeconds)}</strong>
      </div>
      <div className="replanning-comparison">
        <div>
          <span>Bloco que atrasou</span>
          <b>{dateTime.format(new Date(suggestion.overdueBlock.startsAt))}</b>
        </div>
        <span aria-hidden="true">→</span>
        <div>
          <span>Novo horário sugerido</span>
          <b>{dateTime.format(new Date(suggestion.suggestedStartsAt))}</b>
        </div>
      </div>
      {open ? (
        <>
          <details className="replanning-editor">
            <summary>Escolher outro horário</summary>
            <form action={editAction}>
              <div className="form-columns">
                <label className="field">
                  <span>Início</span>
                  <input
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={localInputValue(suggestion.suggestedStartsAt)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Término</span>
                  <input
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={localInputValue(suggestion.suggestedEndsAt)}
                    required
                  />
                </label>
              </div>
              <p className="field-help">
                O novo intervalo precisa preservar as{" "}
                {duration(suggestion.suggestedDurationSeconds)} restantes.
              </p>
              {editState.message ? (
                <p className="form-message" role="alert">
                  {editState.message}
                </p>
              ) : null}
              {editState.success ? (
                <p className="form-success" role="status">
                  {editState.success}
                </p>
              ) : null}
              <button className="secondary-button" disabled={busy}>
                {editing ? "Salvando…" : "Salvar outro horário"}
              </button>
            </form>
          </details>
          <div className="replanning-decisions">
            <form action={acceptAction}>
              <input
                name="idempotencyKey"
                type="hidden"
                value={acceptIdempotencyKey}
              />
              <label className="confirmation-check">
                <input name="confirmation" type="checkbox" value="confirmed" />
                <span>Confirmo que desejo substituir o bloco atrasado.</span>
              </label>
              {acceptState.message ? (
                <p className="form-message" role="alert">
                  {acceptState.message}
                </p>
              ) : null}
              {acceptState.success ? (
                <p className="form-success" role="status">
                  {acceptState.success}
                </p>
              ) : null}
              <button className="button" disabled={busy}>
                {accepting ? "Confirmando…" : "Aceitar e adicionar à agenda"}
              </button>
            </form>
            <form action={rejectAction}>
              {rejectState.message ? (
                <p className="form-message" role="alert">
                  {rejectState.message}
                </p>
              ) : null}
              <button className="danger-button" disabled={busy}>
                {rejecting ? "Rejeitando…" : "Rejeitar sugestão"}
              </button>
            </form>
          </div>
        </>
      ) : suggestion.status === "REJECTED" &&
        suggestion.overdueBlock.status === "OVERDUE" ? (
        <form action={requestAction} className="replanning-request-form">
          <p>
            O plano permaneceu como estava. Você pode solicitar outro horário.
          </p>
          {requestState.message ? (
            <p className="form-message" role="alert">
              {requestState.message}
            </p>
          ) : null}
          <button className="secondary-button" disabled={busy}>
            {requesting ? "Calculando…" : "Sugerir novamente"}
          </button>
        </form>
      ) : suggestion.status === "REJECTED" ? (
        <p className="replanning-history-note">
          Este bloco já foi tratado em outra decisão.
        </p>
      ) : null}
    </article>
  );
}
