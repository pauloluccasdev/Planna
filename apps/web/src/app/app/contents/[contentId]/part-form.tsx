"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPart, type PartFormState } from "./actions";

const initialState: PartFormState = {};

export function PartForm({ contentId }: { contentId: string }) {
  const boundAction = createPart.bind(null, contentId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message && !state.errors) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="content-create-form">
      <div className="field">
        <label htmlFor="part-name">Nome da parte</label>
        <input
          id="part-name"
          name="name"
          placeholder="Ex.: Anatomia do coração"
          minLength={2}
          maxLength={200}
          required
        />
        {state.errors?.name && (
          <span className="field-error">{state.errors.name}</span>
        )}
      </div>
      <div className="field">
        <label htmlFor="part-description">Descrição ou observação</label>
        <textarea
          id="part-description"
          name="description"
          placeholder="Opcional"
          maxLength={2000}
          rows={3}
        />
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Salvando…" : "Adicionar parte"}
      </button>
    </form>
  );
}
