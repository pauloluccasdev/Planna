import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { SubjectForm } from "./subject-form";
import { PeriodForm } from "./period-form";
import { SubjectEditor } from "./subject-editor";

type Props = { params: Promise<{ courseId: string }> };
type Course = { id: string; name: string; description: string | null };
type Subject = {
  id: string;
  name: string;
  description: string | null;
  academicPeriodId: string | null;
  updatedAt: string;
};
type Period = {
  id: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
};

export const metadata: Metadata = { title: "Disciplinas" };

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const [courseResponse, subjectsResponse, periodsResponse] = await Promise.all(
    [
      authenticatedApi(`courses/${courseId}`),
      authenticatedApi(`courses/${courseId}/subjects`),
      authenticatedApi(`courses/${courseId}/periods`),
    ],
  );
  if (!courseResponse || courseResponse.status === 401) redirect("/login");
  if (courseResponse.status === 404) notFound();
  if (!courseResponse.ok) throw new Error("Não foi possível carregar o curso.");
  const course = ((await courseResponse.json()) as { data: Course }).data;
  const subjects = subjectsResponse?.ok
    ? ((await subjectsResponse.json()) as { data: Subject[] }).data
    : [];
  const periods = periodsResponse?.ok
    ? ((await periodsResponse.json()) as { data: Period[] }).data
    : [];
  const periodNames = new Map(
    periods.map((period) => [period.id, period.name]),
  );
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href="/app/courses">
          Voltar aos cursos
        </Link>
      </header>
      <section className="resource-heading">
        <div>
          <span className="eyebrow">Curso</span>
          <h1>{course.name}</h1>
          <p>Organize as disciplinas que fazem parte desta graduação.</p>
        </div>
      </section>
      <section className="periods-panel dashboard-card">
        <div>
          <span className="eyebrow">Calendário letivo</span>
          <h2>Períodos do curso</h2>
          {periods.length ? (
            <div className="period-list">
              {periods.map((period) => (
                <span key={period.id}>
                  <b>{period.name}</b>
                  {period.startsOn || period.endsOn ? (
                    <small>
                      {period.startsOn?.slice(0, 10) ?? "…"} —{" "}
                      {period.endsOn?.slice(0, 10) ?? "…"}
                    </small>
                  ) : null}
                </span>
              ))}
            </div>
          ) : (
            <p>Nenhum período cadastrado.</p>
          )}
        </div>
        <PeriodForm courseId={courseId} />
      </section>
      <section className="resource-layout">
        <div className="resource-list">
          {subjects.length === 0 ? (
            <div className="dashboard-card resource-empty">
              <h2>Nenhuma disciplina cadastrada.</h2>
              <p>Adicione a primeira disciplina para organizar os conteúdos.</p>
            </div>
          ) : (
            subjects.map((subject) => (
              <article className="dashboard-card subject-row" key={subject.id}>
                <Link
                  className="resource-row subject-row-link"
                  href={`/app/subjects/${subject.id}`}
                >
                  <div>
                    <span className="resource-status">Disciplina</span>
                    <h2>{subject.name}</h2>
                    {subject.academicPeriodId ? (
                      <small>{periodNames.get(subject.academicPeriodId)}</small>
                    ) : null}
                  </div>
                  <span>Ver conteúdos →</span>
                </Link>
                <SubjectEditor
                  key={`${subject.id}:${subject.updatedAt}`}
                  courseId={courseId}
                  subject={subject}
                  periods={periods}
                />
              </article>
            ))
          )}
        </div>
        <aside className="dashboard-card create-card">
          <span className="eyebrow">Nova disciplina</span>
          <SubjectForm courseId={courseId} periods={periods} />
        </aside>
      </section>
    </main>
  );
}
