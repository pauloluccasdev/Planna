"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSubject, type SubjectFormState } from "./actions";

const initialState: SubjectFormState = {};

type Period = { id: string; name: string };

export function SubjectForm({
  courseId,
  periods,
}: {
  courseId: string;
  periods: Period[];
}) {
  const boundAction = createSubject.bind(null, courseId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="subject-create-form">
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
      <div className="field">
        <label htmlFor="subject-period">Período letivo</label>
        <select id="subject-period" name="academicPeriodId" defaultValue="">
          <option value="">Sem período definido</option>
          {periods.map((period) => (
            <option value={period.id} key={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      {state.success && <p className="form-success">{state.success}</p>}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Salvando…" : "Adicionar disciplina"}
      </button>
    </form>
  );
}
