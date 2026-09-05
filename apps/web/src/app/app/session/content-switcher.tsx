"use client";

import { useActionState } from "react";
import { switchStudyContent, type SwitchContentState } from "./actions";

type Content = {
  id: string;
  name: string;
  subject: { name: string; course: { name: string } };
};

export function ContentSwitcher({
  sessionId,
  contents,
}: {
  sessionId: string;
  contents: Content[];
}) {
  const [state, action, pending] = useActionState<SwitchContentState, FormData>(
    switchStudyContent.bind(null, sessionId),
    {},
  );

  if (contents.length === 0) return null;
  return (
    <details className="session-content-switcher">
      <summary>Mudar o conteúdo estudado</summary>
      <form action={action}>
        <p>
          A sessão atual será pausada. O novo conteúdo será registrado como
          estudo não planejado, sem alterar sua agenda confirmada.
        </p>
        <label className="field">
          <span>Novo conteúdo</span>
          <select name="contentId" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {contents.map((content) => (
              <option value={content.id} key={content.id}>
                {content.subject.course.name} · {content.subject.name} ·{" "}
                {content.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Motivo ou observação (opcional)</span>
          <textarea name="note" maxLength={2000} />
        </label>
        {state.message ? (
          <p className="form-error" role="alert">
            {state.message}
          </p>
        ) : null}
        <button className="secondary-button" type="submit" disabled={pending}>
          {pending ? "Mudando…" : "Pausar atual e mudar"}
        </button>
      </form>
    </details>
  );
}
