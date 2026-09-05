"use client";

import { useActionState, useState } from "react";
import { type EventFormState, updateAcademicEvent } from "./actions";

type Option = { id: string; name: string };
type Event = {
  id: string;
  eventTypeId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  contentsStatus: "INFORMED" | "NOT_INFORMED_YET";
  contentLinks: Array<{ content: { id: string } }>;
};

function localInputValue(value: string | null) {
  if (!value) return "";
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

export function EventEditor({
  subjectId,
  event,
  eventTypes,
  contents,
}: {
  subjectId: string;
  event: Event;
  eventTypes: Option[];
  contents: Option[];
}) {
  const [contentsKnown, setContentsKnown] = useState(
    event.contentsStatus === "INFORMED",
  );
  const selectedContents = new Set(
    event.contentLinks.map((link) => link.content.id),
  );
  const action = updateAcademicEvent.bind(null, subjectId, event.id);
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    action,
    {},
  );

  return (
    <details className="event-editor">
      <summary>Editar evento</summary>
      <form action={formAction} className="event-form">
        <label className="field">
          <span>Tipo</span>
          <select name="eventTypeId" defaultValue={event.eventTypeId} required>
            {eventTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Título</span>
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={event.title}
          />
        </label>
        <div className="form-columns">
          <label className="field">
            <span>Data e horário</span>
            <input
              name="startsAt"
              type="datetime-local"
              defaultValue={localInputValue(event.startsAt)}
              required
            />
          </label>
          <label className="field">
            <span>Término (opcional)</span>
            <input
              name="endsAt"
              type="datetime-local"
              defaultValue={localInputValue(event.endsAt)}
            />
          </label>
        </div>
        <label className="field">
          <span>Descrição (opcional)</span>
          <textarea
            name="description"
            maxLength={4000}
            defaultValue={event.description ?? ""}
          />
        </label>
        <fieldset className="contents-choice">
          <legend>O professor informou os conteúdos?</legend>
          <label>
            <input
              type="radio"
              name="contentsStatus"
              value="NOT_INFORMED_YET"
              checked={!contentsKnown}
              onChange={() => setContentsKnown(false)}
            />
            Ainda não
          </label>
          <label>
            <input
              type="radio"
              name="contentsStatus"
              value="INFORMED"
              checked={contentsKnown}
              onChange={() => setContentsKnown(true)}
            />
            Sim, quero selecionar
          </label>
        </fieldset>
        {contentsKnown ? (
          <fieldset className="completion-parts">
            <legend>Conteúdos cobrados</legend>
            {contents.map((content) => (
              <label key={content.id}>
                <input
                  type="checkbox"
                  name="contentIds"
                  value={content.id}
                  defaultChecked={selectedContents.has(content.id)}
                />
                <span>{content.name}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {state.message ? (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        ) : null}
        {state.success ? (
          <p className="form-success" role="status">
            {state.success}
          </p>
        ) : null}
        <button className="button" type="submit" disabled={pending}>
          {pending ? "Atualizando…" : "Salvar alterações"}
        </button>
      </form>
    </details>
  );
}
