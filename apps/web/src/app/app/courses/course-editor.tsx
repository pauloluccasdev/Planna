"use client";

import { useActionState } from "react";
import { ResourceDeleteButton } from "../_components/resource-delete-button";
import { deleteCourse, type CourseFormState, updateCourse } from "./actions";

type Course = {
  id: string;
  name: string;
  description: string | null;
};

export function CourseEditor({ course }: { course: Course }) {
  const action = updateCourse.bind(null, course.id);
  const [state, formAction, pending] = useActionState<
    CourseFormState,
    FormData
  >(action, {});

  return (
    <details className="course-editor academic-editor">
      <summary>
        <span className="academic-editor-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
            <path d="m14.8 6.4 3 3" />
          </svg>
        </span>
        <span className="academic-editor-label">
          <strong>Editar informações do curso</strong>
          <small>Altere o nome ou adicione uma descrição</small>
        </span>
        <span className="academic-editor-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <div className="academic-editor-content">
        <form action={formAction} className="course-edit-form">
          <label className="field">
            <span>Nome</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={160}
              defaultValue={course.name}
            />
            {state.nameError ? (
              <span className="field-error">{state.nameError}</span>
            ) : null}
          </label>
          <label className="field">
            <span>Descrição (opcional)</span>
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={course.description ?? ""}
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
          action={deleteCourse.bind(null, course.id)}
          label="Excluir curso"
          pendingLabel="Excluindo…"
          confirmation={`Excluir definitivamente o curso “${course.name}”? Esta ação só será permitida se ele não possuir disciplinas ou histórico.`}
        />
      </div>
    </details>
  );
}
