import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";
import { CourseForm } from "./course-form";

export const metadata: Metadata = { title: "Cursos" };

type Course = {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  _count: { subjects: number };
};

export default async function CoursesPage() {
  const response = await authenticatedApi("courses");
  if (!response || response.status === 401) redirect("/login");
  const courses = response.ok
    ? ((await response.json()) as { data: Course[] }).data
    : [];
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href="/app">
          Voltar à semana
        </Link>
      </header>
      <section className="resource-heading">
        <div>
          <span className="eyebrow">Estrutura acadêmica</span>
          <h1>Seus cursos</h1>
          <p>Você pode organizar mais de uma graduação no mesmo perfil.</p>
        </div>
      </section>
      <section className="resource-layout">
        <div className="resource-list">
          {courses.length === 0 ? (
            <div className="dashboard-card resource-empty">
              <h2>Comece pelo seu curso.</h2>
              <p>Depois você poderá adicionar disciplinas e conteúdos.</p>
            </div>
          ) : (
            courses.map((course) => (
              <Link
                className="dashboard-card resource-row"
                href={`/app/courses/${course.id}`}
                key={course.id}
              >
                <div>
                  <span className="resource-status">Ativo</span>
                  <h2>{course.name}</h2>
                </div>
                <span>{course._count.subjects} disciplinas →</span>
              </Link>
            ))
          )}
        </div>
        <aside className="dashboard-card create-card">
          <span className="eyebrow">Novo curso</span>
          <CourseForm />
        </aside>
      </section>
    </main>
  );
}
