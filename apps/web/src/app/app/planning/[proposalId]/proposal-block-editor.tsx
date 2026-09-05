"use client";

import { useActionState, useState } from "react";
import {
  removeProposedBlock,
  updateProposedBlock,
  type PlanningFormState,
} from "../actions";

type ContentOption = {
  id: string;
  name: string;
  subject: { name: string; course: { name: string } };
  parts: Array<{ id: string; name: string }>;
};

type ProposedBlock = {
  id: string;
  contentId: string;
  revision: number;
  startsAt: string;
  endsAt: string;
  plannedDurationSeconds: number;
  focusSeconds: number;
  breakSeconds: number;
  explanationFactors: {
    priority?: number;
    proximityScore?: number;
    reason?: string;
  };
  content: ContentOption;
  parts: Array<{ contentPart: { id: string } }>;
};

const initialState: PlanningFormState = {};
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return (
    `${hours ? `${hours}h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes}min` : ""}` ||
    "0min"
  );
}

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

export function ProposalBlockEditor({
  proposalId,
  block,
  contents,
}: {
  proposalId: string;
  block: ProposedBlock;
  contents: ContentOption[];
}) {
  const [contentId, setContentId] = useState(block.contentId);
  const [partIds, setPartIds] = useState(
    () => new Set(block.parts.map(({ contentPart }) => contentPart.id)),
  );
  const selectedContent = contents.find((content) => content.id === contentId);
  const needsPartAssignment = Boolean(
    selectedContent?.parts.length && partIds.size === 0,
  );
  const [editState, editAction, editing] = useActionState(
    updateProposedBlock.bind(null, proposalId, block.id, block.revision),
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeProposedBlock.bind(null, proposalId, block.id),
    initialState,
  );

  function changeContent(nextId: string) {
    setContentId(nextId);
    setPartIds(new Set());
  }

  return (
    <article className="proposal-block">
      <time dateTime={block.startsAt}>
        {dateTime.format(new Date(block.startsAt))}
      </time>
      <div>
        <span>
          {block.content.subject.course.name} · {block.content.subject.name}
        </span>
        <h3>{block.content.name}</h3>
        <small>
          {duration(block.plannedDurationSeconds)} · foco de{" "}
          {duration(block.focusSeconds)} · pausa de{" "}
          {duration(block.breakSeconds)}
        </small>
        {needsPartAssignment ? (
          <strong className="proposal-parts-required">
            Selecione ao menos uma parte em “Personalizar bloco”.
          </strong>
        ) : null}
        <details className="proposal-editor">
          <summary>Personalizar bloco</summary>
          <form action={editAction}>
            <label className="field">
              <span>Conteúdo</span>
              <select
                name="contentId"
                value={contentId}
                onChange={(event) => changeContent(event.target.value)}
              >
                {contents.map((content) => (
                  <option value={content.id} key={content.id}>
                    {content.subject.course.name} · {content.subject.name} ·{" "}
                    {content.name}
                  </option>
                ))}
              </select>
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
              </label>
              <label className="field">
                <span>Término</span>
                <input
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={localInputValue(block.endsAt)}
                  required
                />
              </label>
            </div>
            {selectedContent?.parts.length ? (
              <fieldset className="parts-picker">
                <legend>Partes deste bloco</legend>
                <div>
                  {selectedContent.parts.map((part) => (
                    <label key={part.id}>
                      <input
                        checked={partIds.has(part.id)}
                        name="partIds"
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setPartIds((current) => {
                            const next = new Set(current);
                            if (checked) next.add(part.id);
                            else next.delete(part.id);
                            return next;
                          });
                        }}
                        type="checkbox"
                        value={part.id}
                      />
                      <span>{part.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <div className="form-columns">
              <label className="field">
                <span>Foco por ciclo (min)</span>
                <input
                  defaultValue={block.focusSeconds / 60}
                  min="1"
                  name="focusMinutes"
                  step="1"
                  type="number"
                  required
                />
              </label>
              <label className="field">
                <span>Pausa por ciclo (min)</span>
                <input
                  defaultValue={block.breakSeconds / 60}
                  min="1"
                  name="breakMinutes"
                  step="1"
                  type="number"
                  required
                />
              </label>
            </div>
            {editState.message ? (
              <p className="form-message" role="alert">
                {editState.message}
              </p>
            ) : null}
            <button
              className="button button-small"
              disabled={editing || removing}
            >
              {editing ? "Salvando…" : "Salvar personalização"}
            </button>
          </form>
          <form action={removeAction} className="proposal-remove-form">
            {removeState.message ? (
              <p className="form-message" role="alert">
                {removeState.message}
              </p>
            ) : null}
            <button
              className="danger-button"
              disabled={editing || removing}
              type="submit"
            >
              {removing ? "Removendo…" : "Remover da proposta"}
            </button>
          </form>
        </details>
      </div>
      <div className="proposal-reason">
        <span>Por que agora?</span>
        <small>
          {block.explanationFactors.reason === "STUDENT_EDITED"
            ? "Personalizado por você"
            : `Prioridade ${block.explanationFactors.priority ?? "—"}${
                (block.explanationFactors.proximityScore ?? 0) > 0
                  ? " e evento acadêmico próximo"
                  : ""
              }`}
        </small>
      </div>
    </article>
  );
}
