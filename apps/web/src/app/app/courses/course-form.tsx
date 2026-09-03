"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourse, type CourseFormState } from "./actions";

const initialState: CourseFormState = {};

export function CourseForm() {
  const [state, action, pending] = useActionState(createCourse, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.message && !state.nameError) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="inline-create-form">
      <div className="field">
        <label htmlFor="course-name">Nome do curso</label>
        <input
          id="course-name"
          name="name"
          placeholder="Ex.: Nutrição"
          minLength={2}
          maxLength={160}
          required
          aria-describedby={state.nameError ? "course-name-error" : undefined}
        />
        {state.nameError && (
          <span className="field-error" id="course-name-error">
            {state.nameError}
          </span>
        )}
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Salvando…" : "Adicionar curso"}
      </button>
    </form>
  );
}
