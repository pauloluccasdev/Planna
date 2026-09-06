"use client";

import { useActionState } from "react";

export type ResourceDeleteState = { message?: string };

export function ResourceDeleteButton({
  action,
  label,
  pendingLabel,
  confirmation,
}: {
  action: (
    state: ResourceDeleteState,
    formData: FormData,
  ) => Promise<ResourceDeleteState>;
  label: string;
  pendingLabel: string;
  confirmation: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="resource-delete-form"
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="danger-button" type="submit" disabled={pending}>
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
