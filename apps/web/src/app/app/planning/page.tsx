import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";
import { PlanningForm } from "./planning-form";

export const metadata: Metadata = { title: "Gerar planejamento" };

type Course = { id: string; name: string };
type Subject = { id: string; name: string };

export default async function PlanningPage() {
  const coursesResponse = await authenticatedApi("courses");
  if (!coursesResponse || coursesResponse.status === 401) redirect("/login");
  const courses = coursesResponse.ok
    ? ((await coursesResponse.json()) as { data: Course[] }).data
    : [];
  const subjectsByCourse = await Promise.all(
    courses.map(async (course) => {
      const response = await authenticatedApi(
        `courses/${course.id}/subjects?status=ACTIVE`,
      );
      return response?.ok
        ? ((await response.json()) as { data: Subject[] }).data
        : [];
    }),
  );
  const options = courses.map((course, index) => ({
    ...course,
    subjects: subjectsByCourse[index],
  }));

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
      <section className="resource-heading planning-heading">
        <div>
          <span className="eyebrow">Planejamento automático</span>
          <h1>Monte um plano possível para sua rotina.</h1>
          <p>
            O Planna cruza disponibilidade, prioridades, estimativas e datas
            acadêmicas para sugerir seus próximos blocos.
          </p>
        </div>
      </section>
      {courses.length === 0 ? (
        <section className="dashboard-card resource-empty">
          <h2>Cadastre um curso antes de planejar.</h2>
          <p>O planejamento precisa de disciplinas e conteúdos para começar.</p>
          <Link className="button" href="/app/courses">
            Cadastrar curso
          </Link>
        </section>
      ) : (
        <section className="dashboard-card planning-card">
          <PlanningForm courses={options} />
        </section>
      )}
    </main>
  );
}
