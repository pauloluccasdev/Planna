"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelStudyBlock,
  cancelStudyBlockSeries,
  startStudySession,
} from "./session/actions";

type Props = {
  blockId: string;
  recurrenceSeriesId: string | null;
  canStart: boolean;
  canEdit: boolean;
  startIdempotencyKey: string;
};

export function BlockActions({
  blockId,
  recurrenceSeriesId,
  canStart,
  canEdit,
  startIdempotencyKey,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function showCancellationResult(result: {
    warnings: { uncoveredContents: Array<{ name: string }> };
  }) {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set(
      "cancellation",
      result.warnings.uncoveredContents.length > 0 ? "uncovered" : "success",
    );
    router.replace(`/app?${nextSearchParams.toString()}`);
  }

  function start() {
    setError("");
    startTransition(async () => {
      await startStudySession(blockId, startIdempotencyKey);
    });
  }

  function cancelSeries() {
    if (
      !recurrenceSeriesId ||
      !window.confirm(
        "Deseja cancelar todos os blocos ainda ativos desta série? Blocos já concluídos serão preservados.",
      )
    )
      return;
    setError("");
    startTransition(async () => {
      try {
        showCancellationResult(
          await cancelStudyBlockSeries(recurrenceSeriesId),
        );
      } catch {
        setError("Não foi possível cancelar a série.");
      }
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
        showCancellationResult(await cancelStudyBlock(blockId));
      } catch {
        setError("Não foi possível cancelar o bloco.");
      }
    });
  }

  return (
    <div className="calendar-actions">
      {canEdit ? (
        <Link className="calendar-edit" href={`/app/blocks/${blockId}/edit`}>
          Editar
        </Link>
      ) : null}
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
      {recurrenceSeriesId ? (
        <button
          className="calendar-cancel-series"
          type="button"
          disabled={pending}
          onClick={cancelSeries}
        >
          Cancelar série
        </button>
      ) : null}
      {error ? <small className="form-error">{error}</small> : null}
    </div>
  );
}
