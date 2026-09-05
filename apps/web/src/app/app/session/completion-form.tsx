"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
import { completeStudySession, pauseStudySession } from "./actions";

type Part = { id: string; name: string };

export function CompletionForm({
  sessionId,
  sessionStatus,
  parts,
  completedPartIds,
  note,
  plannedEndsAt,
}: {
  sessionId: string;
  sessionStatus: "RUNNING" | "PAUSED";
  parts: Part[];
  completedPartIds: string[];
  note: string;
  plannedEndsAt: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const completionConfirmed = useRef(false);
  const [showDecision, setShowDecision] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const completed = new Set(completedPartIds);

  function submit(event: FormEvent<HTMLFormElement>) {
    const isEarly =
      plannedEndsAt !== null && Date.now() < new Date(plannedEndsAt).getTime();
    if (!isEarly || completionConfirmed.current) return;
    event.preventDefault();
    setShowDecision(true);
  }

  function confirmCompletion() {
    completionConfirmed.current = true;
    setShowDecision(false);
    queueMicrotask(() => formRef.current?.requestSubmit());
  }

  function pauseForLater() {
    setError("");
    startTransition(async () => {
      try {
        if (sessionStatus === "RUNNING") await pauseStudySession(sessionId);
        router.push("/app");
      } catch {
        setError("Não foi possível pausar a sessão.");
        setShowDecision(false);
      }
    });
  }

  return (
    <>
      <form
        ref={formRef}
        action={completeStudySession.bind(null, sessionId)}
        onSubmit={submit}
      >
        {parts.length > 0 ? (
          <fieldset className="completion-parts">
            <legend>Partes do bloco</legend>
            {parts.map((part) => (
              <label key={part.id}>
                <input
                  type="checkbox"
                  name="completedPartIds"
                  value={part.id}
                  defaultChecked={completed.has(part.id)}
                />
                <span>{part.name}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <label className="field">
          <span>Observação (opcional)</span>
          <textarea name="note" maxLength={2000} defaultValue={note} />
        </label>
        <button className="danger-button" type="submit">
          {plannedEndsAt ? "Concluir este bloco" : "Concluir sessão"}
        </button>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {showDecision ? (
        <div className="decision-backdrop" role="presentation">
          <section
            className="decision-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="early-completion-title"
          >
            <span className="eyebrow">Antes do horário previsto</span>
            <h3 id="early-completion-title">Você finalizou este bloco?</h3>
            <p>
              Ainda há tempo planejado. Você pode concluir agora sem atraso ou
              apenas pausar para continuar depois.
            </p>
            <div>
              <button
                className="secondary-button"
                type="button"
                disabled={pending}
                onClick={() => setShowDecision(false)}
              >
                Voltar
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={pending}
                onClick={pauseForLater}
              >
                {pending ? "Pausando…" : "Pausar e continuar depois"}
              </button>
              <button
                className="button"
                type="button"
                disabled={pending}
                onClick={confirmCompletion}
              >
                Concluir agora
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
