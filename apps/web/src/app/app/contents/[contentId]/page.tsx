import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { ResourceDeleteButton } from "../../_components/resource-delete-button";
import { deleteContent, movePart } from "./actions";
import { ContentCompletion } from "./content-completion";
import { PartForm } from "./part-form";
import { PartManager } from "./part-manager";

type Props = { params: Promise<{ contentId: string }> };
type Content = {
  id: string;
  subjectId: string;
  name: string;
  description: string | null;
  priority: number;
  estimatedDurationSeconds: number | null;
};
type Part = {
  id: string;
  name: string;
  description: string | null;
  position: number;
};
type ContentProgress = {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  totalParts: number;
  completedParts: number;
  completedPartIds: string[];
  percentage: number | null;
  futureBlockCount: number;
  needsFuturePlanning: boolean;
};

const statusLabels: Record<ContentProgress["status"], string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

export const metadata: Metadata = { title: "Partes do conteúdo" };

export default async function ContentPage({ params }: Props) {
  const { contentId } = await params;
  const [contentResponse, partsResponse, progressResponse] = await Promise.all([
    authenticatedApi(`contents/${contentId}`),
    authenticatedApi(`contents/${contentId}/parts`),
    authenticatedApi(`contents/${contentId}/progress`),
  ]);
  if (!contentResponse || contentResponse.status === 401) redirect("/login");
  if (contentResponse.status === 404) notFound();
  if (!contentResponse.ok)
    throw new Error("Não foi possível carregar o conteúdo.");
  const content = ((await contentResponse.json()) as { data: Content }).data;
  const parts = partsResponse?.ok
    ? ((await partsResponse.json()) as { data: Part[] }).data
    : [];
  const progress = progressResponse?.ok
    ? ((await progressResponse.json()) as { data: ContentProgress }).data
    : null;
  const completedPartIds = new Set(progress?.completedPartIds ?? []);
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href={`/app/subjects/${content.subjectId}`}>
          Voltar aos conteúdos
        </Link>
      </header>
      <section className="resource-heading content-detail-heading">
        <div className="content-detail-heading-copy">
          <span className="eyebrow">
            Conteúdo · Prioridade {content.priority}
          </span>
          <h1>{content.name}</h1>
          <p>
            {content.description ||
              "Divida o conteúdo para acompanhar o progresso com mais precisão."}
          </p>
        </div>
        <aside className="content-action-panel" aria-label="Ações do conteúdo">
          <div className="content-action-panel-heading">
            <span className="eyebrow">Ações do conteúdo</span>
            <p>Escolha o que deseja fazer agora.</p>
          </div>
          <div className="content-primary-actions">
            <Link
              className="button"
              href={`/app/contents/${contentId}/blocks/new`}
            >
              Planejar este conteúdo
            </Link>
            <Link
              className="secondary-button"
              href={`/app/contents/${contentId}/edit`}
            >
              Editar informações
            </Link>
          </div>
          <div className="content-danger-action">
            <ResourceDeleteButton
              action={deleteContent.bind(null, contentId, content.subjectId)}
              label="Excluir conteúdo"
              pendingLabel="Excluindo…"
              confirmation={`Excluir definitivamente o conteúdo “${content.name}”? Esta ação só será permitida se ele não possuir eventos, blocos ou sessões.`}
            />
          </div>
        </aside>
      </section>
      {progress ? (
        <section className="content-progress dashboard-card">
          <div>
            <span className="eyebrow">Progresso automático</span>
            <h2>{statusLabels[progress.status]}</h2>
            <p>
              {progress.totalParts
                ? `${progress.completedParts} de ${progress.totalParts} partes concluídas`
                : progress.status === "COMPLETED"
                  ? "Conclusão confirmada manualmente por você."
                  : progress.status === "IN_PROGRESS"
                    ? "Existe execução registrada. Confirme quando terminar todo o conteúdo."
                    : "Nenhuma execução registrada até agora."}
            </p>
          </div>
          <div className="progress-summary">
            <strong>
              {progress.percentage == null
                ? "—"
                : `${Math.round(progress.percentage)}%`}
            </strong>
            {progress.percentage != null ? (
              <div
                className="progress-track"
                aria-label={`${Math.round(progress.percentage)}% concluído`}
              >
                <span style={{ width: `${progress.percentage}%` }} />
              </div>
            ) : null}
            <small>{progress.futureBlockCount} blocos futuros</small>
            {progress.totalParts === 0 && progress.status !== "COMPLETED" ? (
              <ContentCompletion contentId={contentId} />
            ) : null}
          </div>
          {progress.needsFuturePlanning ? (
            <div className="planning-warning">
              Ainda existe trabalho neste conteúdo, mas nenhum bloco futuro está
              planejado.
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="content-parts-section">
        <header className="content-parts-heading">
          <div>
            <span className="eyebrow">Organização do estudo</span>
            <h2>Partes do conteúdo</h2>
          </div>
          <p>
            Dividir é opcional. Use partes apenas se quiser acompanhar capítulos
            ou etapas separadamente.
          </p>
        </header>
        {parts.length === 0 ? (
          <div className="dashboard-card content-parts-empty">
            <div className="content-parts-empty-icon" aria-hidden="true">
              01
            </div>
            <div className="content-parts-empty-copy">
              <span className="eyebrow">Configuração atual</span>
              <h3>Estudar o conteúdo completo</h3>
              <p>
                Você não precisa cadastrar partes para planejar ou estudar este
                conteúdo. Se ele tiver capítulos ou etapas, você pode dividi-lo
                agora.
              </p>
            </div>
            <details className="content-parts-disclosure">
              <summary>Dividir este conteúdo em partes</summary>
              <div className="content-parts-form-panel">
                <h3>Adicionar a primeira parte</h3>
                <p>
                  Comece pelo primeiro capítulo, tópico ou etapa que deseja
                  acompanhar.
                </p>
                <PartForm contentId={contentId} />
              </div>
            </details>
          </div>
        ) : (
          <div className="content-layout">
            <div className="resource-list" aria-label="Partes cadastradas">
              <div className="content-parts-list-heading">
                <strong>
                  {parts.length} {parts.length === 1 ? "parte" : "partes"}
                </strong>
                <span>Use as setas para definir a ordem de estudo.</span>
              </div>
              {parts.map((part, index) => (
                <article
                  className={`dashboard-card part-row ${completedPartIds.has(part.id) ? "part-completed" : ""}`}
                  key={part.id}
                >
                  <span className="part-position">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2>{part.name}</h2>
                    {completedPartIds.has(part.id) ? (
                      <small>Concluída</small>
                    ) : null}
                    {part.description && <p>{part.description}</p>}
                  </div>
                  <div
                    className="order-actions"
                    aria-label={`Ordenar ${part.name}`}
                  >
                    <form
                      action={movePart.bind(null, contentId, part.id, "up")}
                    >
                      <button
                        disabled={index === 0}
                        type="submit"
                        aria-label="Mover para cima"
                      >
                        ↑
                      </button>
                    </form>
                    <form
                      action={movePart.bind(null, contentId, part.id, "down")}
                    >
                      <button
                        disabled={index === parts.length - 1}
                        type="submit"
                        aria-label="Mover para baixo"
                      >
                        ↓
                      </button>
                    </form>
                  </div>
                  <PartManager contentId={contentId} part={part} />
                </article>
              ))}
            </div>
            <aside className="dashboard-card create-card content-create-card">
              <span className="eyebrow">Continuar dividindo</span>
              <h2>Adicionar outra parte</h2>
              <p>Cadastre o próximo capítulo ou etapa deste conteúdo.</p>
              <PartForm contentId={contentId} />
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
