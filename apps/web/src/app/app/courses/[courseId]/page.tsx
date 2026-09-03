import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { SubjectForm } from "./subject-form";

type Props = { params: Promise<{ courseId: string }> };
type Course = { id: string; name: string; description: string | null };
type Subject = { id: string; name: string; description: string | null };

export const metadata: Metadata = { title: "Disciplinas" };

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const [courseResponse, subjectsResponse] = await Promise.all([
    authenticatedApi(`courses/${courseId}`),
    authenticatedApi(`courses/${courseId}/subjects`),
  ]);
  if (!courseResponse || courseResponse.status === 401) redirect("/login");
  if (courseResponse.status === 404) notFound();
  if (!courseResponse.ok) throw new Error("Não foi possível carregar o curso.");
  const course = ((await courseResponse.json()) as { data: Course }).data;
  const subjects = subjectsResponse?.ok
    ? ((await subjectsResponse.json()) as { data: Subject[] }).data
    : [];
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
      <section className="resource-layout">
        <div className="resource-list">
          {subjects.length === 0 ? (
            <div className="dashboard-card resource-empty">
              <h2>Nenhuma disciplina cadastrada.</h2>
              <p>Adicione a primeira disciplina para organizar os conteúdos.</p>
            </div>
          ) : (
            subjects.map((subject) => (
              <div className="dashboard-card resource-row" key={subject.id}>
                <div>
                  <span className="resource-status">Disciplina</span>
                  <h2>{subject.name}</h2>
                </div>
              </div>
            ))
          )}
        </div>
        <aside className="dashboard-card create-card">
          <span className="eyebrow">Nova disciplina</span>
          <SubjectForm courseId={courseId} />
        </aside>
      </section>
    </main>
  );
}
