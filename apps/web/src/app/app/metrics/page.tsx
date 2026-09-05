import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";

export const metadata: Metadata = { title: "Indicadores" };

type Search = {
  from?: string;
  to?: string;
  period?: string;
  courseId?: string;
  subjectId?: string;
  contentId?: string;
};
type Course = { id: string; name: string };
type Content = {
  id: string;
  name: string;
  subject: { id: string; name: string; course: Course };
};
type Metrics = {
  compliance: {
    eligibleBlocks: number;
    completedBlocks: number;
    percentage: number | null;
  };
  time: {
    plannedCompletedSeconds: number;
    realizedCompletedSeconds: number;
    focusCompletedSeconds: number;
    breakCompletedSeconds: number;
    percentage: number | null;
    additionalUnplanned: {
      focusSeconds: number;
      breakSeconds: number;
      realizedSeconds: number;
    };
  };
  adaptation: {
    currentOverdueBlocks: number;
    replannedBlocks: number;
    cancelledBlocks: number;
  };
};

const civilPattern = /^\d{4}-\d{2}-\d{2}$/;

function todayInBrazil() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function selectedRange(search: Search) {
  const today = todayInBrazil();
  if (
    civilPattern.test(search.from ?? "") &&
    civilPattern.test(search.to ?? "") &&
    search.from! <= search.to!
  ) {
    return { from: search.from!, to: search.to! };
  }
  if (search.period === "week") {
    const anchor = new Date(`${today}T12:00:00Z`);
    const monday = addDays(today, -((anchor.getUTCDay() + 6) % 7));
    return { from: monday, to: addDays(monday, 6) };
  }
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return `${minutes} min`;
  return `${hours}h${minutes ? ` ${minutes}min` : ""}`;
}

function percentageLabel(value: number | null) {
  return value == null ? "—" : `${Math.round(value)}%`;
}

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const range = selectedRange(search);
  const [coursesResponse, contentsResponse] = await Promise.all([
    authenticatedApi("courses"),
    authenticatedApi("contents"),
  ]);
  if (coursesResponse?.status === 401 || contentsResponse?.status === 401)
    redirect("/login");
  const courses = coursesResponse?.ok
    ? ((await coursesResponse.json()) as { data: Course[] }).data
    : [];
  const contents = contentsResponse?.ok
    ? ((await contentsResponse.json()) as { data: Content[] }).data
    : [];
  const subjects = Array.from(
    new Map(
      contents.map((content) => [
        content.subject.id,
        {
          id: content.subject.id,
          name: content.subject.name,
          course: content.subject.course,
        },
      ]),
    ).values(),
  );
  const filters = new URLSearchParams({
    from: `${range.from}T00:00:00-03:00`,
    to: `${addDays(range.to, 1)}T00:00:00-03:00`,
  });
  if (search.courseId) filters.set("courseId", search.courseId);
  if (search.subjectId) filters.set("subjectId", search.subjectId);
  if (search.contentId) filters.set("contentId", search.contentId);
  const metricsResponse = await authenticatedApi(
    `metrics/summary?${filters.toString()}`,
  );
  if (metricsResponse?.status === 401) redirect("/login");
  const metrics = metricsResponse?.ok
    ? ((await metricsResponse.json()) as { data: Metrics }).data
    : null;

  return (
    <main className="dashboard-shell metrics-page">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="secondary-button" href="/app">
          Voltar à agenda
        </Link>
      </header>

      <section className="dashboard-intro">
        <div>
          <span className="eyebrow">Acompanhamento</span>
          <h1>Planejado × realizado</h1>
          <p>Analise cumprimento, tempo efetivo e adaptações no período.</p>
        </div>
        <div className="metrics-presets" aria-label="Períodos rápidos">
          <Link href="/app/metrics?period=week">Esta semana</Link>
          <Link href="/app/metrics?period=month">Este mês</Link>
        </div>
      </section>

      <form className="metrics-filters" method="get">
        <label>
          <span>De</span>
          <input name="from" type="date" defaultValue={range.from} required />
        </label>
        <label>
          <span>Até</span>
          <input name="to" type="date" defaultValue={range.to} required />
        </label>
        <label>
          <span>Curso</span>
          <select name="courseId" defaultValue={search.courseId ?? ""}>
            <option value="">Todos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Disciplina</span>
          <select name="subjectId" defaultValue={search.subjectId ?? ""}>
            <option value="">Todas</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.course.name} — {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Conteúdo</span>
          <select name="contentId" defaultValue={search.contentId ?? ""}>
            <option value="">Todos</option>
            {contents.map((content) => (
              <option key={content.id} value={content.id}>
                {content.subject.name} — {content.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          Aplicar filtros
        </button>
      </form>

      {metrics ? (
        <>
          <section className="metrics-strip" aria-label="Indicadores filtrados">
            <article>
              <span>Cumprimento</span>
              <strong>{percentageLabel(metrics.compliance.percentage)}</strong>
              <small>
                {metrics.compliance.completedBlocks} de{" "}
                {metrics.compliance.eligibleBlocks} blocos
              </small>
            </article>
            <article>
              <span>Tempo realizado</span>
              <strong>
                {durationLabel(metrics.time.realizedCompletedSeconds)}
              </strong>
              <small>
                de {durationLabel(metrics.time.plannedCompletedSeconds)}{" "}
                planejados
              </small>
            </article>
            <article>
              <span>Aproveitamento do tempo</span>
              <strong>{percentageLabel(metrics.time.percentage)}</strong>
              <small>nos blocos concluídos</small>
            </article>
            <article>
              <span>Estudo adicional</span>
              <strong>
                {durationLabel(
                  metrics.time.additionalUnplanned.realizedSeconds,
                )}
              </strong>
              <small>fora do planejamento</small>
            </article>
          </section>

          <section className="metrics-detail-grid">
            <article className="dashboard-card">
              <span className="eyebrow">Composição do realizado</span>
              <dl>
                <div>
                  <dt>Foco</dt>
                  <dd>{durationLabel(metrics.time.focusCompletedSeconds)}</dd>
                </div>
                <div>
                  <dt>Pausas Pomodoro</dt>
                  <dd>{durationLabel(metrics.time.breakCompletedSeconds)}</dd>
                </div>
              </dl>
            </article>
            <article className="dashboard-card">
              <span className="eyebrow">Adaptações</span>
              <dl>
                <div>
                  <dt>Atrasos atuais</dt>
                  <dd>{metrics.adaptation.currentOverdueBlocks}</dd>
                </div>
                <div>
                  <dt>Replanejados</dt>
                  <dd>{metrics.adaptation.replannedBlocks}</dd>
                </div>
                <div>
                  <dt>Cancelados</dt>
                  <dd>{metrics.adaptation.cancelledBlocks}</dd>
                </div>
              </dl>
            </article>
          </section>
        </>
      ) : (
        <section className="dashboard-card form-message" role="alert">
          Não foi possível carregar os indicadores deste período.
        </section>
      )}
    </main>
  );
}
