import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../_lib/api";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Minha semana" };

type MeResponse = {
  data: { username: string; email: string; role: string };
};
type CalendarItem =
  | {
      type: "study_block";
      id: string;
      startsAt: string;
      endsAt: string;
      status: string;
      content: {
        name: string;
        subject: { name: string; course: { name: string } };
      };
    }
  | {
      type: "academic_event";
      id: string;
      title: string;
      startsAt: string;
      endsAt: string | null;
      eventType: { name: string };
      subject: { name: string; course: { name: string } };
    };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function dateInBrazil() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function weekRange(anchorText?: string) {
  const validAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorText ?? "")
    ? anchorText!
    : dateInBrazil();
  const anchor = new Date(`${validAnchor}T12:00:00Z`);
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7));
  const next = new Date(monday);
  next.setUTCDate(monday.getUTCDate() + 7);
  const previous = new Date(monday);
  previous.setUTCDate(monday.getUTCDate() - 7);
  const civil = (value: Date) => value.toISOString().slice(0, 10);
  return {
    from: `${civil(monday)}T00:00:00-03:00`,
    to: `${civil(next)}T00:00:00-03:00`,
    current: civil(monday),
    previous: civil(previous),
    next: civil(next),
  };
}

type Props = { searchParams: Promise<{ week?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const range = weekRange(week);
  const [meResponse, calendarResponse] = await Promise.all([
    authenticatedApi("me"),
    authenticatedApi(
      `calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    ),
  ]);
  if (!meResponse?.ok) redirect("/login");
  const { data: user } = (await meResponse.json()) as MeResponse;
  const calendar = calendarResponse?.ok
    ? ((await calendarResponse.json()) as { data: CalendarItem[] }).data
    : [];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <div className="user-menu">
          <span>@{user.username}</span>
          <form action={logout}>
            <button type="submit">Sair</button>
          </form>
        </div>
      </header>
      <section className="dashboard-intro">
        <div>
          <span className="eyebrow">Minha semana</span>
          <h1>Olá, {user.username}.</h1>
          <p>Seus blocos e compromissos acadêmicos aparecerão aqui.</p>
        </div>
        <Link className="button" href="/app/courses">
          Organizar estudos
        </Link>
      </section>
      <section className="dashboard-grid">
        <article className="dashboard-card agenda-placeholder">
          <div className="card-heading">
            <h2>Agenda semanal</h2>
            <div className="week-navigation">
              <Link
                href={`/app?week=${range.previous}`}
                aria-label="Semana anterior"
              >
                ←
              </Link>
              <span>{calendar.length} itens</span>
              <Link
                href={`/app?week=${range.next}`}
                aria-label="Próxima semana"
              >
                →
              </Link>
            </div>
          </div>
          {calendar.length === 0 ? (
            <div className="empty-state">
              <span>7 dias</span>
              <h3>Sua semana ainda está livre.</h3>
              <p>
                Cadastre a disponibilidade e gere seu primeiro planejamento.
              </p>
            </div>
          ) : (
            <div className="calendar-list">
              {calendar.map((item) => (
                <article
                  className={`calendar-item ${item.type}`}
                  key={`${item.type}-${item.id}`}
                >
                  <time dateTime={item.startsAt}>
                    {dateTime.format(new Date(item.startsAt))}
                  </time>
                  <div>
                    <span>
                      {item.type === "study_block"
                        ? item.content.subject.name
                        : item.eventType.name}
                    </span>
                    <h3>
                      {item.type === "study_block"
                        ? item.content.name
                        : item.title}
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
        <aside className="dashboard-card next-actions">
          <span className="eyebrow">Próximos passos</span>
          <ol>
            <li>
              <Link href="/app/courses">Cadastrar curso e disciplinas →</Link>
            </li>
            <li>Adicionar conteúdos e prioridades</li>
            <li>Informar disponibilidade semanal</li>
            <li>
              <Link href="/app/settings/study">
                Configurar horários e Pomodoro →
              </Link>
            </li>
          </ol>
        </aside>
      </section>
    </main>
  );
}
