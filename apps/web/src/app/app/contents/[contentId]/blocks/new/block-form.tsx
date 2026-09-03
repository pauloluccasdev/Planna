"use client";

import { useActionState } from "react";
import { createStudyBlock, type BlockFormState } from "./actions";

type Part = { id: string; name: string };
const initialState: BlockFormState = {};

export function BlockForm({
  contentId,
  parts,
  focusSeconds,
  breakSeconds,
  defaultStartsAt,
  defaultEndsAt,
}: {
  contentId: string;
  parts: Part[];
  focusSeconds: number;
  breakSeconds: number;
  defaultStartsAt: string;
  defaultEndsAt: string;
}) {
  const boundAction = createStudyBlock.bind(null, contentId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  return (
    <form action={action} className="block-create-form">
      <div className="form-columns">
        <div className="field">
          <label htmlFor="block-start">Início</label>
          <input
            id="block-start"
            name="startsAt"
            type="datetime-local"
            defaultValue={defaultStartsAt}
            required
          />
          {state.errors?.startsAt && (
            <span className="field-error">{state.errors.startsAt}</span>
          )}
        </div>
        <div className="field">
          <label htmlFor="block-end">Término</label>
          <input
            id="block-end"
            name="endsAt"
            type="datetime-local"
            defaultValue={defaultEndsAt}
            required
          />
          {state.errors?.endsAt && (
            <span className="field-error">{state.errors.endsAt}</span>
          )}
        </div>
      </div>
      {parts.length > 0 && (
        <fieldset className="parts-picker">
          <legend>Partes deste bloco</legend>
          <p>Selecione uma ou várias partes do mesmo conteúdo.</p>
          <div>
            {parts.map((part) => (
              <label key={part.id}>
                <input type="checkbox" name="partIds" value={part.id} />
                <span>{part.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="form-columns">
        <div className="field">
          <label htmlFor="block-focus">Foco por ciclo</label>
          <div className="unit-input">
            <input
              id="block-focus"
              name="focusMinutes"
              type="number"
              min="1"
              step="1"
              defaultValue={Math.max(1, Math.round(focusSeconds / 60))}
              required
            />
            <span>min</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="block-break">Pausa por ciclo</label>
          <div className="unit-input">
            <input
              id="block-break"
              name="breakMinutes"
              type="number"
              min="1"
              step="1"
              defaultValue={Math.max(1, Math.round(breakSeconds / 60))}
              required
            />
            <span>min</span>
          </div>
        </div>
      </div>
      {state.errors?.pomodoro && (
        <p className="form-message" role="alert">
          {state.errors.pomodoro}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Criando bloco…" : "Confirmar bloco"}
      </button>
    </form>
  );
}
