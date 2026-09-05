"use client";

import { useActionState, useState } from "react";
import { type BlockEditState, updateStudyBlock } from "./actions";

type Content = {
  id: string;
  name: string;
  subject: { name: string; course: { name: string } };
  parts: Array<{ id: string; name: string }>;
};

type Block = {
  id: string;
  contentId: string;
  startsAt: string;
  endsAt: string;
  focusSeconds: number;
  breakSeconds: number;
  revision: number;
  recurrenceSeriesId: string | null;
  parts: Array<{ contentPart: { id: string } }>;
};

function localInputValue(value: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function BlockEditForm({
  block,
  contents,
}: {
  block: Block;
  contents: Content[];
}) {
  const [contentId, setContentId] = useState(block.contentId);
  const [partIds, setPartIds] = useState(
    () => new Set(block.parts.map(({ contentPart }) => contentPart.id)),
  );
  const selectedContent = contents.find((content) => content.id === contentId);
  const action = updateStudyBlock.bind(null, block.id, block.revision);
  const [state, formAction, pending] = useActionState<BlockEditState, FormData>(
    action,
    {},
  );

  function changeContent(nextContentId: string) {
    setContentId(nextContentId);
    setPartIds(new Set());
  }

  function togglePart(partId: string, checked: boolean) {
    setPartIds((current) => {
      const next = new Set(current);
      if (checked) next.add(partId);
      else next.delete(partId);
      return next;
    });
  }

  return (
    <form action={formAction} className="block-create-form">
      {block.recurrenceSeriesId ? (
        <p className="planning-warning">
          Esta alteração afetará somente esta ocorrência da série.
        </p>
      ) : null}
      <label className="field">
        <span>Conteúdo</span>
        <select
          name="contentId"
          value={contentId}
          onChange={(event) => changeContent(event.target.value)}
          required
        >
          {contents.map((content) => (
            <option value={content.id} key={content.id}>
              {content.subject.course.name} · {content.subject.name} ·{" "}
              {content.name}
            </option>
          ))}
        </select>
        {state.errors?.contentId ? (
          <span className="field-error">{state.errors.contentId}</span>
        ) : null}
      </label>
      <div className="form-columns">
        <label className="field">
          <span>Início</span>
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={localInputValue(block.startsAt)}
            required
          />
          {state.errors?.startsAt ? (
            <span className="field-error">{state.errors.startsAt}</span>
          ) : null}
        </label>
        <label className="field">
          <span>Término</span>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={localInputValue(block.endsAt)}
            required
          />
          {state.errors?.endsAt ? (
            <span className="field-error">{state.errors.endsAt}</span>
          ) : null}
        </label>
      </div>
      {selectedContent?.parts.length ? (
        <fieldset className="parts-picker">
          <legend>Partes deste bloco</legend>
          <p>Selecione uma ou várias partes do conteúdo escolhido.</p>
          <div>
            {selectedContent.parts.map((part) => (
              <label key={part.id}>
                <input
                  type="checkbox"
                  name="partIds"
                  value={part.id}
                  checked={partIds.has(part.id)}
                  onChange={(event) =>
                    togglePart(part.id, event.target.checked)
                  }
                />
                <span>{part.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="form-columns">
        <label className="field">
          <span>Foco por ciclo</span>
          <div className="unit-input">
            <input
              name="focusMinutes"
              type="number"
              min="1"
              max="240"
              step="1"
              defaultValue={block.focusSeconds / 60}
              required
            />
            <span>min</span>
          </div>
        </label>
        <label className="field">
          <span>Pausa por ciclo</span>
          <div className="unit-input">
            <input
              name="breakMinutes"
              type="number"
              min="1"
              max="60"
              step="1"
              defaultValue={block.breakSeconds / 60}
              required
            />
            <span>min</span>
          </div>
        </label>
      </div>
      {state.errors?.pomodoro ? (
        <p className="form-error" role="alert">
          {state.errors.pomodoro}
        </p>
      ) : null}
      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Atualizando bloco…" : "Salvar alterações"}
      </button>
    </form>
  );
}
