import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { movePart } from "./actions";
import { PartForm } from "./part-form";

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

export const metadata: Metadata = { title: "Partes do conteúdo" };

export default async function ContentPage({ params }: Props) {
  const { contentId } = await params;
  const [contentResponse, partsResponse] = await Promise.all([
    authenticatedApi(`contents/${contentId}`),
    authenticatedApi(`contents/${contentId}/parts`),
  ]);
  if (!contentResponse || contentResponse.status === 401) redirect("/login");
  if (contentResponse.status === 404) notFound();
  if (!contentResponse.ok)
    throw new Error("Não foi possível carregar o conteúdo.");
  const content = ((await contentResponse.json()) as { data: Content }).data;
  const parts = partsResponse?.ok
    ? ((await partsResponse.json()) as { data: Part[] }).data
    : [];
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
      <section className="resource-heading">
        <div>
          <span className="eyebrow">
            Conteúdo · Prioridade {content.priority}
          </span>
          <h1>{content.name}</h1>
          <p>
            {content.description ||
              "Divida o conteúdo para acompanhar o progresso com mais precisão."}
          </p>
        </div>
        <div className="resource-heading-actions">
          <Link
            className="secondary-button"
            href={`/app/contents/${contentId}/edit`}
          >
            Editar conteúdo
          </Link>
          <Link
            className="button"
            href={`/app/contents/${contentId}/blocks/new`}
          >
            Planejar este conteúdo
          </Link>
        </div>
      </section>
      <section className="content-layout">
        <div className="resource-list">
          {parts.length === 0 ? (
            <div className="dashboard-card resource-empty">
              <h2>Nenhuma parte cadastrada.</h2>
              <p>Você também pode estudar o conteúdo completo sem dividi-lo.</p>
            </div>
          ) : (
            parts.map((part, index) => (
              <article className="dashboard-card part-row" key={part.id}>
                <span className="part-position">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{part.name}</h2>
                  {part.description && <p>{part.description}</p>}
                </div>
                <div
                  className="order-actions"
                  aria-label={`Ordenar ${part.name}`}
                >
                  <form action={movePart.bind(null, contentId, part.id, "up")}>
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
              </article>
            ))
          )}
        </div>
        <aside className="dashboard-card create-card content-create-card">
          <span className="eyebrow">Nova parte</span>
          <PartForm contentId={contentId} />
        </aside>
      </section>
    </main>
  );
}
