"use client";

import { useActionState, useMemo, useState } from "react";
import {
  registerRetroactiveStudy,
  startUnplannedStudy,
  type StudyFormState,
} from "./actions";

type Content = {
  id: string;
  name: string;
  subject: { name: string; course: { name: string } };
  parts: Array<{ id: string; name: string }>;
};
type StudyBlock = {
  id: string;
  contentId: string;
  startsAt: string;
  status: string;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

const statusLabels: Record<string, string> = {
  CONFIRMED: "confirmado",
  OVERDUE: "atrasado",
};

function ContentOptions({ contents }: { contents: Content[] }) {
  return (
    <>
      <option value="" disabled>
        Selecione
      </option>
      {contents.map((content) => (
        <option key={content.id} value={content.id}>
          {content.subject.course.name} · {content.subject.name} ·{" "}
          {content.name}
        </option>
      ))}
    </>
  );
}

export function StudyForms({
  contents,
  retroactiveBlocks,
  liveIdempotencyKey,
  retroactiveIdempotencyKey,
}: {
  contents: Content[];
  retroactiveBlocks: StudyBlock[];
  liveIdempotencyKey: string;
  retroactiveIdempotencyKey: string;
}) {
  const [selectedContentId, setSelectedContentId] = useState("");
  const [studyBlockId, setStudyBlockId] = useState("");
  const selectedContent = useMemo(
    () => contents.find((content) => content.id === selectedContentId),
    [contents, selectedContentId],
  );
  const selectedContentBlocks = useMemo(
    () =>
      retroactiveBlocks.filter(
        (block) => block.contentId === selectedContentId,
      ),
    [retroactiveBlocks, selectedContentId],
  );
  const [liveState, liveAction, livePending] = useActionState<
    StudyFormState,
    FormData
  >(startUnplannedStudy, {});
  const [pastState, pastAction, pastPending] = useActionState<
    StudyFormState,
    FormData
  >(registerRetroactiveStudy, {});

  return (
    <div className="study-form-grid">
      <article className="dashboard-card study-form-card">
        <span className="eyebrow">Estudar agora</span>
        <h2>Sessão não planejada</h2>
        <p>
          O cronômetro começa agora, mesmo que o conteúdo não esteja na agenda.
        </p>
        <form action={liveAction}>
          <input
            type="hidden"
            name="idempotencyKey"
            value={liveIdempotencyKey}
          />
          <label className="field">
            <span>Conteúdo</span>
            <select name="contentId" required defaultValue="">
              <ContentOptions contents={contents} />
            </select>
          </label>
          <label className="field">
            <span>Observação inicial (opcional)</span>
            <textarea name="note" maxLength={2000} />
          </label>
          {liveState.message ? (
            <p className="form-error">{liveState.message}</p>
          ) : null}
          <button className="button" type="submit" disabled={livePending}>
            {livePending ? "Iniciando…" : "Iniciar cronômetro"}
          </button>
        </form>
      </article>

      <article className="dashboard-card study-form-card">
        <span className="eyebrow">Registrar depois</span>
        <h2>Estudo retroativo</h2>
        <p>Use quando você estudou sem abrir o Planna.</p>
        <form action={pastAction}>
          <input
            type="hidden"
            name="idempotencyKey"
            value={retroactiveIdempotencyKey}
          />
          <label className="field">
            <span>Conteúdo</span>
            <select
              name="contentId"
              required
              value={selectedContentId}
              onChange={(event) => {
                setSelectedContentId(event.target.value);
                setStudyBlockId("");
              }}
            >
              <ContentOptions contents={contents} />
            </select>
          </label>
          <div className="form-columns">
            <label className="field">
              <span>Início</span>
              <input name="startedAt" type="datetime-local" required />
            </label>
            <label className="field">
              <span>Término</span>
              <input name="endedAt" type="datetime-local" required />
            </label>
          </div>
          <label className="field">
            <span>Como este estudo deve ser classificado?</span>
            <select
              name="studyBlockId"
              value={studyBlockId}
              onChange={(event) => setStudyBlockId(event.target.value)}
            >
              <option value="">Fora do planejamento</option>
              {selectedContentBlocks.map((block) => (
                <option key={block.id} value={block.id}>
                  Bloco de {dateTime.format(new Date(block.startsAt))} ·{" "}
                  {statusLabels[block.status] ?? block.status.toLowerCase()}
                </option>
              ))}
            </select>
            <small>
              Ao escolher um bloco, o registro será associado a ele e o bloco
              será concluído. Só aparecem blocos válidos do conteúdo
              selecionado.
            </small>
          </label>
          <label className="field">
            <span>Tempo de pausas (minutos)</span>
            <input
              name="breakMinutes"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
            />
          </label>
          {selectedContent?.parts.length ? (
            <fieldset className="completion-parts">
              <legend>Partes concluídas</legend>
              {selectedContent.parts.map((part) => (
                <label key={part.id}>
                  <input
                    type="checkbox"
                    name="completedPartIds"
                    value={part.id}
                  />
                  <span>{part.name}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <label className="field">
            <span>Observação (opcional)</span>
            <textarea name="note" maxLength={2000} />
          </label>
          {pastState.message ? (
            <p className="form-error">{pastState.message}</p>
          ) : null}
          <button className="button" type="submit" disabled={pastPending}>
            {pastPending ? "Salvando…" : "Registrar estudo"}
          </button>
        </form>
      </article>
    </div>
  );
}
