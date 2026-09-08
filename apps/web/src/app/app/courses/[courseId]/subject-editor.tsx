"use client";

import { useActionState } from "react";
import { ResourceDeleteButton } from "../../_components/resource-delete-button";
import { deleteSubject, type SubjectFormState, updateSubject } from "./actions";

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
    <details className="subject-editor academic-editor">
      <summary>
        <span className="academic-editor-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
            <path d="m14.8 6.4 3 3" />
          </svg>
        </span>
        <span className="academic-editor-label">
          <strong>Editar informações da disciplina</strong>
          <small>Altere nome, período ou descrição</small>
        </span>
        <span className="academic-editor-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="academic-editor-content">
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
        <ResourceDeleteButton
          action={deleteSubject.bind(null, courseId, subject.id)}
          label="Excluir disciplina"
          pendingLabel="Excluindo…"
          confirmation={`Excluir definitivamente a disciplina “${subject.name}”? Esta ação só será permitida se ela não possuir conteúdos, eventos ou histórico.`}
        />
      </div>
    </details>
  );
}
