"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAcademicPeriod, type PeriodFormState } from "./actions";

export function PeriodForm({ courseId }: { courseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<PeriodFormState, FormData>(
    createAcademicPeriod.bind(null, courseId),
    {},
  );
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);
  return (
    <form ref={formRef} action={action} className="period-create-form">
      <label className="field">
        <span>Nome do período</span>
        <input
          name="name"
          minLength={2}
          maxLength={120}
          required
          placeholder="Ex.: 2026.2"
        />
      </label>
      <div className="form-columns">
        <label className="field">
          <span>Início (opcional)</span>
          <input type="date" name="startsOn" />
        </label>
        <label className="field">
          <span>Fim (opcional)</span>
          <input type="date" name="endsOn" />
        </label>
      </div>
      {state.message ? <p className="form-error">{state.message}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
      <button className="secondary-button" type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Criar período"}
      </button>
    </form>
  );
}
