"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { removePart, updatePart, type PartEditState } from "./actions";

type Props = {
  contentId: string;
  part: { id: string; name: string; description: string | null };
};

export function PartManager({ contentId, part }: Props) {
  const router = useRouter();
  const [removing, startTransition] = useTransition();
  const [removeError, setRemoveError] = useState("");
  const [state, action, pending] = useActionState<PartEditState, FormData>(
    updatePart.bind(null, contentId, part.id),
    {},
  );

  function confirmRemoval() {
    if (
      !window.confirm(
        `Deseja excluir a parte “${part.name}”? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setRemoveError("");
    startTransition(async () => {
      const result = await removePart(contentId, part.id);
      if (!result.ok) setRemoveError(result.message);
      else router.refresh();
    });
  }

  return (
    <details className="part-manager">
      <summary>Editar parte</summary>
      <form action={action}>
        <label className="field">
          <span>Nome</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={200}
            defaultValue={part.name}
          />
        </label>
        <label className="field">
          <span>Descrição ou observação</span>
          <textarea
            name="description"
            maxLength={4000}
            defaultValue={part.description ?? ""}
          />
        </label>
        {state.message ? <p className="form-error">{state.message}</p> : null}
        {state.success ? <p className="form-success">{state.success}</p> : null}
        {removeError ? <p className="form-error">{removeError}</p> : null}
        <div className="part-edit-actions">
          <button
            className="button"
            type="submit"
            disabled={pending || removing}
          >
            {pending ? "Salvando…" : "Salvar parte"}
          </button>
          <button
            className="part-delete"
            type="button"
            disabled={pending || removing}
            onClick={confirmRemoval}
          >
            {removing ? "Excluindo…" : "Excluir parte"}
          </button>
        </div>
      </form>
    </details>
  );
}
