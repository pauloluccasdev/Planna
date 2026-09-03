"use client";

import { useActionState, useState } from "react";
import { createAcademicEvent, type EventFormState } from "./actions";

type Props = {
  subjectId: string;
  eventTypes: Array<{ id: string; name: string }>;
  contents: Array<{ id: string; name: string }>;
};

export function EventForm({ subjectId, eventTypes, contents }: Props) {
  const [contentsKnown, setContentsKnown] = useState(false);
  const action = createAcademicEvent.bind(null, subjectId);
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    action,
    {},
  );

  return (
    <form className="event-form" action={formAction}>
      <label className="field">
        <span>Tipo</span>
        <select name="eventTypeId" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
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
          placeholder="Ex.: Prova P1"
        />
      </label>
      <div className="form-columns">
        <label className="field">
          <span>Data e horário</span>
          <input name="startsAt" type="datetime-local" required />
        </label>
        <label className="field">
          <span>Término (opcional)</span>
          <input name="endsAt" type="datetime-local" />
        </label>
      </div>
      <label className="field">
        <span>Descrição (opcional)</span>
        <textarea
          name="description"
          maxLength={4000}
          placeholder="Local, instruções ou observações"
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
          {contents.length ? (
            contents.map((content) => (
              <label key={content.id}>
                <input type="checkbox" name="contentIds" value={content.id} />
                <span>{content.name}</span>
              </label>
            ))
          ) : (
            <p>Cadastre conteúdos nesta disciplina antes de selecioná-los.</p>
          )}
        </fieldset>
      ) : null}
      {state.message ? <p className="form-error">{state.message}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Adicionar à agenda"}
      </button>
    </form>
  );
}
