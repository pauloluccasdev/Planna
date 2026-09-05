"use client";

import { useActionState } from "react";
import { type SubjectFormState, updateSubject } from "./actions";

type Subject = {
  id: string;
  name: string;
  description: string | null;
  academicPeriodId: string | null;
};

type Period = { id: string; name: string };

export function SubjectEditor({
  courseId,
  subject,
  periods,
}: {
  courseId: string;
  subject: Subject;
  periods: Period[];
}) {
  const action = updateSubject.bind(null, courseId, subject.id);
  const [state, formAction, pending] = useActionState<
    SubjectFormState,
    FormData
  >(action, {});

  return (
    <details className="subject-editor">
      <summary>Editar disciplina</summary>
      <form action={formAction} className="subject-edit-form">
        <label className="field">
          <span>Nome</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={subject.name}
          />
          {state.nameError ? (
            <span className="field-error">{state.nameError}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Período letivo</span>
          <select
            name="academicPeriodId"
            defaultValue={subject.academicPeriodId ?? ""}
          >
            <option value="">Sem período definido</option>
            {periods.map((period) => (
              <option value={period.id} key={period.id}>
                {period.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Descrição (opcional)</span>
          <textarea
            name="description"
            maxLength={2000}
            defaultValue={subject.description ?? ""}
          />
        </label>
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
          {pending ? "Atualizando…" : "Salvar alterações"}
        </button>
      </form>
    </details>
  );
}
