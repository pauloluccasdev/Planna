"use client";

import { useActionState, useEffect, useRef } from "react";
import { createContent, type ContentFormState } from "./actions";

const initialState: ContentFormState = {};

export function ContentForm({ subjectId }: { subjectId: string }) {
  const boundAction = createContent.bind(null, subjectId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message && !state.errors) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="content-create-form">
      <div className="field">
        <label htmlFor="content-name">Nome do conteúdo</label>
        <input
          id="content-name"
          name="name"
          placeholder="Ex.: Sistema cardiovascular"
          minLength={2}
          maxLength={200}
          required
        />
        {state.errors?.name && (
          <span className="field-error">{state.errors.name}</span>
        )}
      </div>
      <div className="field">
        <label htmlFor="content-description">Descrição ou observação</label>
        <textarea
          id="content-description"
          name="description"
          placeholder="Opcional"
          maxLength={2000}
          rows={3}
        />
      </div>
      <div className="form-columns">
        <div className="field">
          <label htmlFor="content-priority">Prioridade</label>
          <select
            id="content-priority"
            name="priority"
            defaultValue="3"
            required
          >
            <option value="1">1 — Muito baixa</option>
            <option value="2">2 — Baixa</option>
            <option value="3">3 — Média</option>
            <option value="4">4 — Alta</option>
            <option value="5">5 — Muito alta</option>
          </select>
          {state.errors?.priority && (
            <span className="field-error">{state.errors.priority}</span>
          )}
        </div>
        <div className="field">
          <label htmlFor="content-estimate">Estimativa em minutos</label>
          <input
            id="content-estimate"
            name="estimatedMinutes"
            type="number"
            min="1"
            step="1"
            placeholder="Opcional"
          />
          {state.errors?.estimatedMinutes && (
            <span className="field-error">{state.errors.estimatedMinutes}</span>
          )}
        </div>
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Salvando…" : "Adicionar conteúdo"}
      </button>
    </form>
  );
}
