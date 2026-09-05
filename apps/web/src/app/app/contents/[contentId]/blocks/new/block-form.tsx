"use client";

import { useActionState, useState } from "react";
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
  const [repeatDaily, setRepeatDaily] = useState(false);
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(defaultEndsAt);
  const [repeatUntil, setRepeatUntil] = useState(defaultStartsAt.slice(0, 10));
  const [focusMinutes, setFocusMinutes] = useState(
    String(Math.max(1, Math.round(focusSeconds / 60))),
  );
  const [breakMinutes, setBreakMinutes] = useState(
    String(Math.max(1, Math.round(breakSeconds / 60))),
  );
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
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
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
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
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
          {state.errors?.endsAt && (
            <span className="field-error">{state.errors.endsAt}</span>
          )}
        </div>
      </div>
      <fieldset className="recurrence-picker">
        <label>
          <input
            type="checkbox"
            name="repeatDaily"
            checked={repeatDaily}
            onChange={(event) => setRepeatDaily(event.target.checked)}
          />
          <span>Repetir este bloco diariamente</span>
        </label>
        {repeatDaily ? (
          <label className="field">
            <span>Repetir até</span>
            <input
              type="date"
              name="repeatUntil"
              min={startsAt.slice(0, 10)}
              value={repeatUntil}
              onChange={(event) => setRepeatUntil(event.target.value)}
              required
            />
          </label>
        ) : null}
        <small>
          Todas as ocorrências precisam caber na disponibilidade e estar livres
          de conflitos.
        </small>
      </fieldset>
      {parts.length > 0 && (
        <fieldset className="parts-picker">
          <legend>Partes deste bloco</legend>
          <p>Selecione uma ou várias partes do mesmo conteúdo.</p>
          <div>
            {parts.map((part) => (
              <label key={part.id}>
                <input
                  type="checkbox"
                  name="partIds"
                  value={part.id}
                  checked={selectedPartIds.includes(part.id)}
                  onChange={(event) =>
                    setSelectedPartIds((current) =>
                      event.target.checked
                        ? [...current, part.id]
                        : current.filter((id) => id !== part.id),
                    )
                  }
                />
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
              value={focusMinutes}
              onChange={(event) => setFocusMinutes(event.target.value)}
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
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(event.target.value)}
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
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      {state.canExpandAvailability && (
        <section
          className="availability-expansion"
          aria-labelledby="expand-availability-title"
        >
          <strong id="expand-availability-title">
            Deseja adicionar este horário?
          </strong>
          <p>
            O Planna ampliará sua disponibilidade semanal, mas ainda não criará
            o bloco. Você precisará confirmar o planejamento em seguida.
          </p>
          <button
            className="button secondary-button"
            disabled={pending}
            name="intent"
            value="expandAvailability"
            type="submit"
          >
            {pending ? "Atualizando…" : "Adicionar à disponibilidade"}
          </button>
        </section>
      )}
      <button
        className="button"
        disabled={pending}
        name="intent"
        value="create"
        type="submit"
      >
        {pending ? "Criando bloco…" : "Confirmar bloco"}
      </button>
    </form>
  );
}
