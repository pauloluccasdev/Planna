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
    <details className="course-editor">
      <summary>Editar curso</summary>
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
    </details>
  );
}
