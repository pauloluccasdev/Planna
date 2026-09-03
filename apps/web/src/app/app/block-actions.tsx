"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelStudyBlock, startStudySession } from "./session/actions";

type Props = { blockId: string; canStart: boolean };

export function BlockActions({ blockId, canStart }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function start() {
    setError("");
    startTransition(async () => {
      await startStudySession(blockId);
    });
  }

  function cancel() {
    if (
      !window.confirm(
        "Deseja cancelar este bloco? Ele deixará de contar como não realizado.",
      )
    )
      return;
    setError("");
    startTransition(async () => {
      try {
        await cancelStudyBlock(blockId);
        router.refresh();
      } catch {
        setError("Não foi possível cancelar o bloco.");
      }
    });
  }

  return (
    <div className="calendar-actions">
      <button
        className="calendar-start"
        type="button"
        disabled={pending || !canStart}
        title={
          canStart ? undefined : "Finalize ou retome a sessão atual primeiro"
        }
        onClick={start}
      >
        {pending ? "Aguarde…" : "Iniciar"}
      </button>
      <button
        className="calendar-cancel"
        type="button"
        disabled={pending}
        onClick={cancel}
      >
        Cancelar
      </button>
      {error ? <small className="form-error">{error}</small> : null}
    </div>
  );
}
