"use client";

import { useActionState } from "react";
import { completeContent, type ContentCompletionState } from "./actions";

export function ContentCompletion({ contentId }: { contentId: string }) {
  const [state, action, pending] = useActionState<
    ContentCompletionState,
    FormData
  >(completeContent.bind(null, contentId), {});

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Confirma que terminou todo este conteúdo? O tempo estimado não será usado como confirmação automática.",
          )
        )
          event.preventDefault();
      }}
    >
      <button className="button" disabled={pending} type="submit">
        {pending ? "Concluindo…" : "Concluir conteúdo"}
      </button>
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
