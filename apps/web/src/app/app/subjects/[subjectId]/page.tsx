import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { ContentForm } from "./content-form";

type Props = { params: Promise<{ subjectId: string }> };
type Subject = { id: string; name: string; courseId: string };
type Content = {
  id: string;
  name: string;
  priority: number;
  estimatedDurationSeconds: number | null;
  _count: { parts: number };
  progress: {
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
    completedParts: number;
    totalParts: number;
    percentage: number | null;
    futureBlockCount: number;
    needsFuturePlanning: boolean;
  };
};

const progressLabels: Record<Content["progress"]["status"], string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
};

export const metadata: Metadata = { title: "Conteúdos" };

function durationLabel(seconds: number | null) {
  if (!seconds) return "Sem estimativa";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours ? `${hours}h` : "", minutes ? `${minutes}min` : ""]
    .filter(Boolean)
    .join(" ");
}

export default async function SubjectPage({ params }: Props) {
  const { subjectId } = await params;
  const [subjectResponse, contentsResponse] = await Promise.all([
    authenticatedApi(`subjects/${subjectId}`),
    authenticatedApi(`subjects/${subjectId}/contents`),
  ]);
  if (!subjectResponse || subjectResponse.status === 401) redirect("/login");
  if (subjectResponse.status === 404) notFound();
  if (!subjectResponse.ok)
    throw new Error("Não foi possível carregar a disciplina.");
  const subject = ((await subjectResponse.json()) as { data: Subject }).data;
  const contents = contentsResponse?.ok
    ? ((await contentsResponse.json()) as { data: Content[] }).data
    : [];
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href={`/app/courses/${subject.courseId}`}>
          Voltar às disciplinas
        </Link>
      </header>
      <section className="resource-heading">
        <div>
          <span className="eyebrow">Disciplina</span>
          <h1>{subject.name}</h1>
          <p>Priorize o que precisa estudar e estime a dedicação necessária.</p>
        </div>
        <Link className="button" href={`/app/subjects/${subjectId}/events`}>
          Provas e trabalhos
        </Link>
      </section>
      <section className="content-layout">
        <div className="resource-list">
          {contents.length === 0 ? (
            <div className="dashboard-card resource-empty">
              <h2>Nenhum conteúdo cadastrado.</h2>
              <p>Adicione o primeiro tema que precisa estudar.</p>
            </div>
          ) : (
            contents.map((content) => (
              <Link
                className="dashboard-card content-row"
                href={`/app/contents/${content.id}`}
                key={content.id}
              >
                <div>
                  <div className="content-row-statuses">
                    <span className="resource-status">
                      Prioridade {content.priority}
                    </span>
                    <span
                      className={`content-state content-state-${content.progress.status.toLowerCase().replace("_", "-")}`}
                    >
                      {progressLabels[content.progress.status]}
                    </span>
                  </div>
                  <h2>{content.name}</h2>
                  {content.progress.needsFuturePlanning ? (
                    <strong className="content-planning-alert">
                      Sem blocos futuros · planejar novamente
                    </strong>
                  ) : null}
                </div>
                <div className="content-row-summary">
                  <span>{durationLabel(content.estimatedDurationSeconds)}</span>
                  <span>
                    {content._count.parts}{" "}
                    {content._count.parts === 1 ? "parte" : "partes"} ·{" "}
                    {content.progress.futureBlockCount}{" "}
                    {content.progress.futureBlockCount === 1
                      ? "bloco futuro"
                      : "blocos futuros"}{" "}
                    →
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
        <aside className="dashboard-card create-card content-create-card">
          <span className="eyebrow">Novo conteúdo</span>
          <ContentForm subjectId={subjectId} />
        </aside>
      </section>
    </main>
  );
}
