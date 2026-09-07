"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [open, setOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, pending]);

  return (
    <>
      <div className="resource-delete-form">
        {state.message ? (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        ) : null}
        <button
          className="danger-button"
          type="button"
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          {pending ? pendingLabel : label}
        </button>
      </div>
      {open
        ? createPortal(
            <div
              className="decision-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !pending)
                  setOpen(false);
              }}
            >
              <form
                action={formAction}
                className="decision-dialog resource-delete-dialog"
                aria-labelledby="resource-delete-title"
                aria-describedby="resource-delete-description"
                aria-modal="true"
                role="dialog"
                onSubmit={() => setOpen(false)}
              >
                <span className="eyebrow">Ação permanente</span>
                <h3 id="resource-delete-title">Confirmar exclusão?</h3>
                <p id="resource-delete-description">{confirmation}</p>
                <div>
                  <button
                    ref={cancelButtonRef}
                    className="secondary-button"
                    type="button"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    Manter
                  </button>
                  <button
                    className="danger-button"
                    type="submit"
                    disabled={pending}
                  >
                    {pending ? pendingLabel : label}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
