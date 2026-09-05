"use client";

import { useActionState } from "react";
import { updateContent, type ContentEditState } from "../actions";

type Props = {
  content: {
    id: string;
    subjectId: string;
    name: string;
    description: string | null;
    priority: number;
    estimatedDurationSeconds: number | null;
  };
};

export function ContentEditForm({ content }: Props) {
  const [state, action, pending] = useActionState<ContentEditState, FormData>(
    updateContent.bind(null, content.id, content.subjectId),
    {},
  );
  return (
    <form className="content-edit-form" action={action}>
      <label className="field">
        <span>Nome do conteúdo</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={200}
          defaultValue={content.name}
        />
        {state.errors?.name ? (
          <small className="field-error">{state.errors.name}</small>
        ) : null}
      </label>
      <label className="field">
        <span>Descrição ou observação</span>
        <textarea
          name="description"
          maxLength={4000}
          defaultValue={content.description ?? ""}
        />
      </label>
      <div className="form-columns">
        <label className="field">
          <span>Prioridade</span>
          <select
            name="priority"
            required
            defaultValue={String(content.priority)}
          >
            <option value="1">1 — Muito baixa</option>
            <option value="2">2 — Baixa</option>
            <option value="3">3 — Média</option>
            <option value="4">4 — Alta</option>
            <option value="5">5 — Muito alta</option>
          </select>
          {state.errors?.priority ? (
            <small className="field-error">{state.errors.priority}</small>
          ) : null}
        </label>
        <label className="field">
          <span>Estimativa em minutos</span>
          <input
            name="estimatedMinutes"
            type="number"
            min="1"
            step="1"
            placeholder="Deixe vazio se ainda não souber"
            defaultValue={
              content.estimatedDurationSeconds
                ? content.estimatedDurationSeconds / 60
                : ""
            }
          />
          {state.errors?.estimatedMinutes ? (
            <small className="field-error">
              {state.errors.estimatedMinutes}
            </small>
          ) : null}
        </label>
      </div>
      <p className="edit-assurance">
        Esta alteração será usada em novos planejamentos. Blocos já confirmados
        permanecem iguais.
      </p>
      {state.message ? <p className="form-error">{state.message}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
