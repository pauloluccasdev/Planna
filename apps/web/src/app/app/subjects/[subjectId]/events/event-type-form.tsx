"use client";

import { useActionState } from "react";
import { createEventType, type EventFormState } from "./actions";

export function EventTypeForm({ subjectId }: { subjectId: string }) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    createEventType.bind(null, subjectId),
    {},
  );
  return (
    <form className="inline-create-form" action={action}>
      <label className="field">
        <span>Novo tipo personalizado</span>
        <input name="name" maxLength={80} placeholder="Ex.: Seminário" />
      </label>
      <button className="secondary-button" type="submit" disabled={pending}>
        Criar tipo
      </button>
      {state.message ? <p className="form-error">{state.message}</p> : null}
      {state.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
