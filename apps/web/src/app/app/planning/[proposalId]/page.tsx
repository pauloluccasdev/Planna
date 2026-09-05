import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { ProposalActions } from "./proposal-actions";
import { ProposalBlockEditor } from "./proposal-block-editor";

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
    content: {
      id: string;
      name: string;
      subject: { name: string; course: { name: string } };
      parts: Array<{ id: string; name: string }>;
    };
    parts: Array<{ contentPart: { id: string } }>;
  }>;
  diagnostics: Array<{
    id: string;
    kind: "CAPACITY_DEFICIT" | "MISSING_ESTIMATE" | "UNKNOWN_EVENT_CONTENTS";
    deficitSeconds: number | null;
  }>;
};

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
type ContentOption = Proposal["blocks"][number]["content"];

export default async function PlanningReviewPage({ params }: Props) {
  const { proposalId } = await params;
  const [response, contentsResponse] = await Promise.all([
    authenticatedApi(`planning-proposals/${proposalId}`),
    authenticatedApi("contents?status=ACTIVE"),
  ]);
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) redirect("/app/planning");
  const proposal = ((await response.json()) as { data: Proposal }).data;
  const contents = contentsResponse?.ok
    ? ((await contentsResponse.json()) as { data: ContentOption[] }).data
    : [];
  const actionable = ["READY", "REVIEWING"].includes(proposal.status);
  const currentAllocatedSeconds = proposal.blocks.reduce(
    (total, block) => total + block.plannedDurationSeconds,
    0,
  );
  const currentUnallocatedSeconds = Math.max(
    0,
    (proposal.parametersSnapshot.requestedSeconds ?? 0) -
      currentAllocatedSeconds,
  );

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
          <strong>{duration(currentAllocatedSeconds)}</strong>
        </article>
        <article className="metric-alert">
          <span>Não alocada</span>
          <strong>{duration(currentUnallocatedSeconds)}</strong>
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
              <ProposalBlockEditor
                block={block}
                contents={contents}
                key={`${block.id}:${block.revision}`}
                proposalId={proposal.id}
              />
            ))}
          </div>
        )}
      </section>

      {actionable ? (
        <ProposalActions
          canConfirm={proposal.blocks.length > 0}
          proposalId={proposal.id}
        />
      ) : (
        <section className="dashboard-card proposal-finished">
          Esta proposta está{" "}
          {proposal.status === "CONFIRMED" ? "confirmada" : "encerrada"}.
        </section>
      )}
    </main>
  );
}
