import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { ProposalActions } from "./proposal-actions";

export const metadata: Metadata = { title: "Revisar planejamento" };

type Proposal = {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  parametersSnapshot: {
    requestedSeconds?: number;
    allocatedSeconds?: number;
    unallocatedSeconds?: number;
  };
  blocks: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    plannedDurationSeconds: number;
    focusSeconds: number;
    breakSeconds: number;
    explanationFactors: { priority?: number; proximityScore?: number };
    content: {
      name: string;
      subject: { name: string; course: { name: string } };
    };
  }>;
  diagnostics: Array<{
    id: string;
    kind: "CAPACITY_DEFICIT" | "MISSING_ESTIMATE" | "UNKNOWN_EVENT_CONTENTS";
    deficitSeconds: number | null;
  }>;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function duration(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return (
    `${hours ? `${hours}h` : ""}${hours && minutes ? " " : ""}${minutes ? `${minutes}min` : ""}` ||
    "0min"
  );
}

const diagnosticText = {
  CAPACITY_DEFICIT: "Não há disponibilidade suficiente para toda a carga.",
  MISSING_ESTIMATE: "Um conteúdo ficou de fora porque não possui estimativa.",
  UNKNOWN_EVENT_CONTENTS:
    "Um evento ainda não possui conteúdos informados e pode afetar a prioridade.",
};

type Props = { params: Promise<{ proposalId: string }> };

export default async function PlanningReviewPage({ params }: Props) {
  const { proposalId } = await params;
  const response = await authenticatedApi(`planning-proposals/${proposalId}`);
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) redirect("/app/planning");
  const proposal = ((await response.json()) as { data: Proposal }).data;
  const actionable = ["READY", "REVIEWING"].includes(proposal.status);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href="/app/planning">
          Gerar outra proposta
        </Link>
      </header>
      <section className="resource-heading planning-heading">
        <div>
          <span className="eyebrow">Revisão obrigatória</span>
          <h1>Confira antes de alterar sua agenda.</h1>
          <p>
            Esta proposta ainda não faz parte do seu planejamento confirmado.
          </p>
        </div>
      </section>

      <section className="proposal-summary" aria-label="Resumo da proposta">
        <article>
          <span>Carga identificada</span>
          <strong>
            {duration(proposal.parametersSnapshot.requestedSeconds)}
          </strong>
        </article>
        <article>
          <span>Carga distribuída</span>
          <strong>
            {duration(proposal.parametersSnapshot.allocatedSeconds)}
          </strong>
        </article>
        <article className="metric-alert">
          <span>Não alocada</span>
          <strong>
            {duration(proposal.parametersSnapshot.unallocatedSeconds)}
          </strong>
        </article>
      </section>

      {proposal.diagnostics.length > 0 ? (
        <section className="proposal-alerts" aria-labelledby="proposal-alerts">
          <h2 id="proposal-alerts">Pontos de atenção</h2>
          <ul>
            {proposal.diagnostics.map((diagnostic) => (
              <li key={diagnostic.id}>
                {diagnosticText[diagnostic.kind]}
                {diagnostic.deficitSeconds
                  ? ` Faltam ${duration(diagnostic.deficitSeconds)}.`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dashboard-card proposal-blocks">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Blocos sugeridos</span>
            <h2>
              {proposal.blocks.length}{" "}
              {proposal.blocks.length === 1
                ? "bloco para revisar"
                : "blocos para revisar"}
            </h2>
          </div>
        </div>
        {proposal.blocks.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum bloco pôde ser criado.</h3>
            <p>Confira as estimativas e sua disponibilidade semanal.</p>
          </div>
        ) : (
          <div className="proposal-block-list">
            {proposal.blocks.map((block) => (
              <article className="proposal-block" key={block.id}>
                <time dateTime={block.startsAt}>
                  {dateTime.format(new Date(block.startsAt))}
                </time>
                <div>
                  <span>
                    {block.content.subject.course.name} ·{" "}
                    {block.content.subject.name}
                  </span>
                  <h3>{block.content.name}</h3>
                  <small>
                    {duration(block.plannedDurationSeconds)} · foco de{" "}
                    {duration(block.focusSeconds)} · pausa de{" "}
                    {duration(block.breakSeconds)}
                  </small>
                </div>
                <div className="proposal-reason">
                  <span>Por que agora?</span>
                  <small>
                    Prioridade {block.explanationFactors.priority ?? "—"}
                    {(block.explanationFactors.proximityScore ?? 0) > 0
                      ? " e evento acadêmico próximo"
                      : ""}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {actionable && proposal.blocks.length > 0 ? (
        <ProposalActions proposalId={proposal.id} />
      ) : (
        <section className="dashboard-card proposal-finished">
          Esta proposta está{" "}
          {proposal.status === "CONFIRMED" ? "confirmada" : "encerrada"}.
        </section>
      )}
    </main>
  );
}
