"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSubject, type SubjectFormState } from "./actions";

const initialState: SubjectFormState = {};

export function SubjectForm({ courseId }: { courseId: string }) {
  const boundAction = createSubject.bind(null, courseId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message && !state.nameError) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="inline-create-form">
      <div className="field">
        <label htmlFor="subject-name">Nome da disciplina</label>
        <input
          id="subject-name"
          name="name"
          placeholder="Ex.: Fisiologia"
          minLength={2}
          maxLength={160}
          required
        />
        {state.nameError && (
          <span className="field-error">{state.nameError}</span>
        )}
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Salvando…" : "Adicionar disciplina"}
      </button>
    </form>
  );
}
