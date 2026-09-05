import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";
import { completeStudySession } from "./actions";
import { SessionTimer } from "./session-timer";

export const metadata: Metadata = { title: "Sessão de estudo" };

type Session = {
  id: string;
  status: "RUNNING" | "PAUSED" | "COMPLETED";
  content: {
    id: string;
    name: string;
    parts?: Array<{ id: string; name: string; position: number }>;
  };
  note: string | null;
  segments: Array<{
    kind: "FOCUS" | "POMODORO_BREAK";
    startedAt: string;
    endedAt: string | null;
  }>;
  completedParts: Array<{ contentPart: { id: string; name: string } }>;
  studyBlock: {
    id: string;
    endsAt: string;
    focusSeconds: number;
    breakSeconds: number;
    parts: Array<{
      contentPart: { id: string; name: string; position: number };
    }>;
  } | null;
};

type Props = { searchParams: Promise<{ id?: string }> };

type NextBlock = {
  id: string;
  status: string;
  startsAt: string;
  content: { name: string };
};

export default async function StudySessionPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const response = await authenticatedApi(
    id ? `study-sessions/${id}` : "study-sessions/active",
  );
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Não foi possível carregar a sessão.");
  const session = ((await response.json()) as { data: Session | null }).data;

  if (!session || session.status === "COMPLETED") {
    return (
      <main className="dashboard-shell narrow-shell">
        <header className="dashboard-header">
          <Link className="brand" href="/app">
            <span className="brand-mark">P</span>Planna
          </Link>
          <Link className="back-link" href="/app">
            Voltar à agenda
          </Link>
        </header>
        <section className="empty-session dashboard-card">
          <span className="eyebrow">Sessão de estudo</span>
          <h1>Nenhuma sessão em andamento.</h1>
          <p>Inicie um bloco confirmado diretamente pela agenda.</p>
          <Link className="button" href="/app">
            Ver minha semana
          </Link>
        </section>
      </main>
    );
  }

  const selectedParts = session.studyBlock
    ? session.studyBlock.parts.map((item) => item.contentPart)
    : (session.content.parts ?? []);
  const alreadyCompleted = new Set(
    session.completedParts.map((item) => item.contentPart.id),
  );
  let nextBlock: NextBlock | null = null;
  const currentBlock = session.studyBlock;
  if (currentBlock) {
    const nextBlocksResponse = await authenticatedApi(
      `study-blocks?from=${encodeURIComponent(currentBlock.endsAt)}`,
    );
    if (nextBlocksResponse?.status === 401) redirect("/login");
    if (nextBlocksResponse?.ok) {
      const blocks = (
        (await nextBlocksResponse.json()) as { data: NextBlock[] }
      ).data;
      nextBlock =
        blocks.find(
          (block) =>
            block.id !== currentBlock.id &&
            new Date(block.startsAt) >= new Date(currentBlock.endsAt) &&
            ["CONFIRMED", "OVERDUE", "PAUSED"].includes(block.status),
        ) ?? null;
    }
  }

  return (
    <main className="dashboard-shell narrow-shell session-page">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>Planna
        </Link>
        <Link className="back-link" href="/app">
          Agenda
        </Link>
      </header>
      <section className="session-heading">
        <span className="eyebrow">Estudando agora</span>
        <h1>{session.content.name}</h1>
        <p>Acompanhe o tempo e registre o que foi realmente estudado.</p>
      </section>
      <div className="session-layout">
        <article className="dashboard-card session-card">
          <SessionTimer
            sessionId={session.id}
            status={session.status}
            segments={session.segments}
            serverNow={new Date().toISOString()}
            plannedEndsAt={session.studyBlock?.endsAt ?? null}
            nextBlock={nextBlock}
            focusSeconds={session.studyBlock?.focusSeconds ?? 1500}
            breakSeconds={session.studyBlock?.breakSeconds ?? 300}
          />
        </article>
        <article
          className="dashboard-card completion-card"
          id="session-completion"
        >
          <span className="eyebrow">Finalizar estudo</span>
          <h2>O que você concluiu?</h2>
          <p>
            Confirme as partes finalizadas e, se quiser, deixe uma observação.
          </p>
          <form action={completeStudySession.bind(null, session.id)}>
            {selectedParts.length > 0 ? (
              <fieldset className="completion-parts">
                <legend>Partes do bloco</legend>
                {selectedParts.map((part) => (
                  <label key={part.id}>
                    <input
                      type="checkbox"
                      name="completedPartIds"
                      value={part.id}
                      defaultChecked={alreadyCompleted.has(part.id)}
                    />
                    <span>{part.name}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <label className="field">
              <span>Observação (opcional)</span>
              <textarea
                name="note"
                maxLength={2000}
                defaultValue={session.note ?? ""}
              />
            </label>
            <button className="danger-button" type="submit">
              {session.studyBlock ? "Concluir este bloco" : "Concluir sessão"}
            </button>
          </form>
        </article>
      </div>
    </main>
  );
}
