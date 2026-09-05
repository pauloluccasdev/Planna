import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";

type Props = { params: Promise<{ blockId: string }> };

type Block = {
  id: string;
  source: "MANUAL" | "AUTOMATIC" | "REPLANNED";
  status:
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "PAUSED"
    | "COMPLETED"
    | "OVERDUE"
    | "CANCELLED"
    | "REPLANNED";
  startsAt: string;
  endsAt: string;
  plannedDurationSeconds: number;
  focusSeconds: number;
  breakSeconds: number;
  recurrenceSeriesId: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  content: {
    id: string;
    name: string;
    priority: number;
    subject: {
      id: string;
      name: string;
      course: { id: string; name: string };
    };
  };
  parts: Array<{
    contentPart: { id: string; name: string; position: number };
  }>;
};

type BlockVersion = {
  id: string;
  versionNumber: number;
  changedAt: string;
  changeReason: string | null;
};

const statusLabels: Record<Block["status"], string> = {
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  OVERDUE: "Atrasado",
  CANCELLED: "Cancelado",
  REPLANNED: "Replanejado",
};

const sourceLabels: Record<Block["source"], string> = {
  MANUAL: "Criado manualmente",
  AUTOMATIC: "Planejamento automático",
  REPLANNED: "Replanejamento confirmado",
};

const reasonLabels: Record<string, string> = {
  MANUAL_EDIT: "Edição manual",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "long",
  timeStyle: "short",
});

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours ? `${hours}h` : "", minutes ? `${minutes}min` : ""]
    .filter(Boolean)
    .join(" ");
}

export const metadata: Metadata = { title: "Detalhes do bloco" };

export default async function BlockDetailsPage({ params }: Props) {
  const { blockId } = await params;
  const [blockResponse, historyResponse] = await Promise.all([
    authenticatedApi(`study-blocks/${blockId}`),
    authenticatedApi(`study-blocks/${blockId}/history`),
  ]);
  if (!blockResponse || blockResponse.status === 401) redirect("/login");
  if (blockResponse.status === 404) notFound();
  if (!blockResponse.ok) throw new Error("Não foi possível carregar o bloco.");
  const block = ((await blockResponse.json()) as { data: Block }).data;
  const history = historyResponse?.ok
    ? ((await historyResponse.json()) as { data: BlockVersion[] }).data
    : [];
  const canEdit =
    block.status === "CONFIRMED" && new Date(block.startsAt) > new Date();

  return (
    <main className="dashboard-shell narrow-shell block-details-page">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href="/app">
          Voltar à agenda
        </Link>
      </header>

      <section className="resource-heading block-heading">
        <div>
          <span
            className={`block-state block-state-${block.status.toLowerCase()}`}
          >
            {statusLabels[block.status]}
          </span>
          <h1>{block.content.name}</h1>
          <p>
            {block.content.subject.course.name} · {block.content.subject.name}
          </p>
        </div>
        {canEdit ? (
          <Link className="button" href={`/app/blocks/${block.id}/edit`}>
            Editar bloco
          </Link>
        ) : null}
      </section>

      <section className="block-detail-grid" aria-label="Dados do bloco">
        <article className="dashboard-card">
          <span>Início</span>
          <strong>{dateTime.format(new Date(block.startsAt))}</strong>
        </article>
        <article className="dashboard-card">
          <span>Término</span>
          <strong>{dateTime.format(new Date(block.endsAt))}</strong>
        </article>
        <article className="dashboard-card">
          <span>Duração planejada</span>
          <strong>{durationLabel(block.plannedDurationSeconds)}</strong>
        </article>
        <article className="dashboard-card">
          <span>Origem</span>
          <strong>{sourceLabels[block.source]}</strong>
        </article>
      </section>

      <section className="dashboard-card block-detail-section">
        <div>
          <span className="eyebrow">Ciclo de estudo</span>
          <h2>
            {durationLabel(block.focusSeconds)} de foco ·{" "}
            {durationLabel(block.breakSeconds)} de pausa
          </h2>
        </div>
        <div>
          <span className="eyebrow">Partes planejadas</span>
          {block.parts.length ? (
            <ol className="block-parts-list">
              {block.parts
                .toSorted(
                  (left, right) =>
                    left.contentPart.position - right.contentPart.position,
                )
                .map(({ contentPart }) => (
                  <li key={contentPart.id}>{contentPart.name}</li>
                ))}
            </ol>
          ) : (
            <p>O bloco considera o conteúdo completo.</p>
          )}
        </div>
      </section>

      <section className="block-history">
        <span className="eyebrow">Histórico de alterações</span>
        {history.length ? (
          <ol>
            {history.map((version) => (
              <li className="dashboard-card" key={version.id}>
                <div>
                  <b>Versão {version.versionNumber}</b>
                  <small>
                    {reasonLabels[version.changeReason ?? ""] ??
                      version.changeReason ??
                      "Alteração registrada"}
                  </small>
                </div>
                <time dateTime={version.changedAt}>
                  {dateTime.format(new Date(version.changedAt))}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>Este bloco ainda não possui alterações anteriores.</p>
        )}
      </section>
    </main>
  );
}
