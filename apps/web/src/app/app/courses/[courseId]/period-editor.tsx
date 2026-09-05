"use client";

import { useActionState } from "react";
import { type PeriodFormState, updateAcademicPeriod } from "./actions";

type Period = {
  id: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
};

export function PeriodEditor({
  courseId,
  period,
}: {
  courseId: string;
  period: Period;
}) {
  const action = updateAcademicPeriod.bind(null, courseId, period.id);
  const [state, formAction, pending] = useActionState<
    PeriodFormState,
    FormData
  >(action, {});

  return (
    <details className="period-editor">
      <summary>Editar período</summary>
      <form action={formAction} className="period-edit-form">
        <label className="field">
          <span>Nome do período</span>
          <input
            name="name"
            minLength={2}
            maxLength={120}
            required
            defaultValue={period.name}
          />
        </label>
        <div className="form-columns">
          <label className="field">
            <span>Início (opcional)</span>
            <input
              type="date"
              name="startsOn"
              defaultValue={period.startsOn?.slice(0, 10) ?? ""}
            />
          </label>
          <label className="field">
            <span>Fim (opcional)</span>
            <input
              type="date"
              name="endsOn"
              defaultValue={period.endsOn?.slice(0, 10) ?? ""}
            />
          </label>
        </div>
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
        <button className="secondary-button" type="submit" disabled={pending}>
          {pending ? "Atualizando…" : "Salvar período"}
        </button>
      </form>
    </details>
  );
}
