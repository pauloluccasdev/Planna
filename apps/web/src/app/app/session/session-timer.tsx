"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  pauseStudySession,
  resumeFocus,
  resumeStudySession,
  startPomodoroBreak,
} from "./actions";

type Segment = {
  kind: "FOCUS" | "POMODORO_BREAK";
  startedAt: string;
  endedAt: string | null;
};

type Props = {
  sessionId: string;
  status: string;
  segments: Segment[];
  serverNow: string;
  plannedEndsAt: string | null;
  focusSeconds: number;
  breakSeconds: number;
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function SessionTimer({
  sessionId,
  status,
  segments,
  serverNow,
  plannedEndsAt,
  focusSeconds,
  breakSeconds,
}: Props) {
  const [liveSession, setLiveSession] = useState({ status, segments });
  const [isPending, startTransition] = useTransition();
  const initialNow = new Date(serverNow).getTime();
  const [now, setNow] = useState(initialNow);
  const [overdueDismissed, setOverdueDismissed] = useState(false);
  const current =
    liveSession.segments.find((segment) => !segment.endedAt) ?? null;

  useEffect(() => {
    if (liveSession.status !== "RUNNING") return;
    const offset = Date.now() - initialNow;
    const timer = window.setInterval(() => setNow(Date.now() - offset), 1000);
    return () => window.clearInterval(timer);
  }, [initialNow, liveSession.status]);

  const totals = useMemo(() => {
    let focus = 0;
    let pause = 0;
    for (const segment of liveSession.segments) {
      const end = segment.endedAt ? new Date(segment.endedAt).getTime() : now;
      const elapsed = Math.max(
        0,
        Math.floor((end - new Date(segment.startedAt).getTime()) / 1000),
      );
      if (segment.kind === "FOCUS") focus += elapsed;
      else pause += elapsed;
    }
    return { focus, pause, total: focus + pause };
  }, [liveSession.segments, now]);

  const currentElapsed = current
    ? Math.max(
        0,
        Math.floor((now - new Date(current.startedAt).getTime()) / 1000),
      )
    : 0;
  const recommended = current?.kind === "FOCUS" ? focusSeconds : breakSeconds;
  const cycleFinished = Boolean(current && currentElapsed >= recommended);
  const plannedTimePassed = Boolean(
    plannedEndsAt && now >= new Date(plannedEndsAt).getTime(),
  );
  const updateSession = (
    action: (id: string) => Promise<{ status: string; segments: Segment[] }>,
  ) => {
    startTransition(async () => {
      const updated = await action(sessionId);
      setLiveSession(updated);
      setNow(Date.now());
    });
  };

  return (
    <section className="session-clock" aria-live="polite">
      <span className="eyebrow">
        {current?.kind === "POMODORO_BREAK"
          ? "Pausa Pomodoro"
          : "Tempo efetivo"}
      </span>
      <strong>{formatDuration(totals.total)}</strong>
      <p>
        Foco {formatDuration(totals.focus)} · Pausas{" "}
        {formatDuration(totals.pause)}
      </p>

      {cycleFinished && liveSession.status === "RUNNING" ? (
        <div className="session-notice">
          <b>
            {current?.kind === "FOCUS"
              ? "Seu período de foco terminou."
              : "Sua pausa terminou."}
          </b>
          <span>Você decide quando realizar a troca.</span>
        </div>
      ) : null}

      {plannedTimePassed &&
      !overdueDismissed &&
      liveSession.status === "RUNNING" ? (
        <div className="session-warning">
          <b>O horário planejado deste bloco terminou.</b>
          <span>Continue estudando ou escolha pausar/concluir abaixo.</span>
          <button type="button" onClick={() => setOverdueDismissed(true)}>
            Continuar estudando
          </button>
        </div>
      ) : null}

      <div className="session-controls">
        {liveSession.status === "PAUSED" ? (
          <button
            className="button"
            type="button"
            disabled={isPending}
            onClick={() => updateSession(resumeStudySession)}
          >
            Retomar
          </button>
        ) : (
          <>
            <button
              className="secondary-button"
              type="button"
              disabled={isPending}
              onClick={() => updateSession(pauseStudySession)}
            >
              Pausar sessão
            </button>
            {current?.kind === "FOCUS" ? (
              <button
                className="button"
                type="button"
                disabled={isPending}
                onClick={() => updateSession(startPomodoroBreak)}
              >
                Iniciar pausa
              </button>
            ) : (
              <button
                className="button"
                type="button"
                disabled={isPending}
                onClick={() => updateSession(resumeFocus)}
              >
                Voltar ao foco
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
