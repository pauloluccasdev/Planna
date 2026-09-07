import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../_lib/api";
import { logout } from "./actions";
import { BlockActions } from "./block-actions";

export const metadata: Metadata = { title: "Minha semana" };

type MeResponse = {
  data: { username: string; email: string; role: string };
};
type MetricsSummary = {
  compliance: {
    eligibleBlocks: number;
    completedBlocks: number;
    percentage: number | null;
  };
  time: {
    plannedCompletedSeconds: number;
    realizedCompletedSeconds: number;
    additionalUnplanned: { realizedSeconds: number };
  };
  adaptation: { currentOverdueBlocks: number };
};
type CalendarItem =
  | {
      type: "study_block";
      id: string;
      recurrenceSeriesId: string | null;
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
      subject: { id: string; name: string; course: { name: string } };
    };
type ReplanningSuggestion = { status: string };

type QuickActionIcon =
  "study" | "metrics" | "replanning" | "notifications" | "admin";

function ActionIcon({ name }: { name: QuickActionIcon }) {
  const paths: Record<QuickActionIcon, React.ReactNode> = {
    study: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    metrics: (
      <>
        <path d="M5 19V9M12 19V5M19 19v-7" />
      </>
    ),
    replanning: (
      <>
        <path d="M20 7h-6V1" />
        <path d="M20 7a9 9 0 1 0 1 8" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    admin: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const timeOnly = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});
const brazilDateKey = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const blockStatusLabels: Record<string, string> = {
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  OVERDUE: "Atrasado",
  CANCELLED: "Cancelado",
  REPLANNED: "Replanejado",
};

function dateInBrazil() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function durationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return `${minutes}min`;
  return `${hours}h${minutes ? ` ${minutes}min` : ""}`;
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

function weekDays(firstDay: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${firstDay}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return { key: date.toISOString().slice(0, 10), date };
  });
}

type Props = {
  searchParams: Promise<{ week?: string; cancellation?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { week, cancellation } = await searchParams;
  const range = weekRange(week);
  const days = weekDays(range.current);
  const [
    meResponse,
    calendarResponse,
    activeSessionResponse,
    pausedSessionsResponse,
    metricsResponse,
    replanningResponse,
  ] = await Promise.all([
    authenticatedApi("me"),
    authenticatedApi(
      `calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    ),
    authenticatedApi("study-sessions/active"),
    authenticatedApi("study-sessions/paused"),
    authenticatedApi(
      `metrics/summary?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    ),
    authenticatedApi("replanning-suggestions"),
  ]);
  if (!meResponse?.ok) redirect("/login");
  const { data: user } = (await meResponse.json()) as MeResponse;
  const calendar = calendarResponse?.ok
    ? ((await calendarResponse.json()) as { data: CalendarItem[] }).data
    : [];
  const activeSession = activeSessionResponse?.ok
    ? (
        (await activeSessionResponse.json()) as {
          data: {
            id: string;
            status: string;
            content: { name: string };
          } | null;
        }
      ).data
    : null;
  const runningSession =
    activeSession?.status === "RUNNING" ? activeSession : null;
  const metrics = metricsResponse?.ok
    ? ((await metricsResponse.json()) as { data: MetricsSummary }).data
    : null;
  const pausedSessions = pausedSessionsResponse?.ok
    ? (
        (await pausedSessionsResponse.json()) as {
          data: Array<{
            id: string;
            content: { name: string };
            studyBlock: { endsAt: string } | null;
          }>;
        }
      ).data
    : [];
  const replanningSuggestions = replanningResponse?.ok
    ? (
        (await replanningResponse.json()) as {
          data: ReplanningSuggestion[];
        }
      ).data
    : [];
  const openReplanningCount = replanningSuggestions.filter((suggestion) =>
    ["GENERATED", "EDITING"].includes(suggestion.status),
  ).length;

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
        <div className="dashboard-primary-action">
          <span>Próxima ação</span>
          <Link className="button" href="/app/courses">
            Organizar meus estudos <span aria-hidden="true">→</span>
          </Link>
          <Link href="/app/planning">Criar planejamento</Link>
        </div>
      </section>
      <section
        className="dashboard-actions"
        aria-labelledby="quick-actions-title"
      >
        <div className="dashboard-actions-main">
          <div className="dashboard-actions-heading">
            <div>
              <span className="eyebrow">Atalhos</span>
              <h2 id="quick-actions-title">Ações rápidas</h2>
            </div>
            <span>O que você deseja fazer agora?</span>
          </div>
          <div className="quick-actions-grid">
            <Link href="/app/study/new">
              <span className="quick-action-icon">
                <ActionIcon name="study" />
              </span>
              <span>
                <b>Registrar estudo</b>
                <small>Inclua uma sessão realizada</small>
              </span>
              <span className="quick-action-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/app/metrics">
              <span className="quick-action-icon">
                <ActionIcon name="metrics" />
              </span>
              <span>
                <b>Indicadores</b>
                <small>Acompanhe seu desempenho</small>
              </span>
              <span className="quick-action-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/app/replanning">
              <span className="quick-action-icon">
                <ActionIcon name="replanning" />
              </span>
              <span>
                <b>Replanejar</b>
                <small>Revise atrasos e sugestões</small>
              </span>
              {openReplanningCount ? (
                <span className="quick-action-count">
                  {openReplanningCount}
                </span>
              ) : (
                <span className="quick-action-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </Link>
            <Link href="/app/notifications">
              <span className="quick-action-icon">
                <ActionIcon name="notifications" />
              </span>
              <span>
                <b>Notificações</b>
                <small>Veja lembretes e avisos</small>
              </span>
              <span className="quick-action-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
        {user.role === "ADMIN" ? (
          <aside className="dashboard-admin-action">
            <span className="quick-action-icon">
              <ActionIcon name="admin" />
            </span>
            <span className="eyebrow">Administração</span>
            <h2>Gestão de contas</h2>
            <p>Consulte usuários e gerencie o acesso à plataforma.</p>
            <Link href="/app/admin">
              Administrar contas <span aria-hidden="true">→</span>
            </Link>
          </aside>
        ) : null}
      </section>
      {runningSession ? (
        <section className="active-session-banner">
          <div>
            <span>Sessão em andamento</span>
            <b>{runningSession.content.name}</b>
          </div>
          <Link
            className="button"
            href={`/app/session?id=${runningSession.id}`}
          >
            Abrir cronômetro
          </Link>
        </section>
      ) : null}
      {pausedSessions.length ? (
        <section className="paused-sessions dashboard-card">
          <div className="paused-sessions-heading">
            <div className="paused-sessions-title">
              <span className="paused-sessions-icon" aria-hidden="true" />
              <div>
                <span className="eyebrow">Estudos pausados</span>
                <h2>Continue de onde parou</h2>
              </div>
            </div>
            <span className="paused-sessions-count">
              {pausedSessions.length}{" "}
              {pausedSessions.length === 1 ? "sessão" : "sessões"}
            </span>
          </div>
          <div className="paused-sessions-list">
            {pausedSessions.map((session) => (
              <article key={session.id}>
                <div className="paused-session-copy">
                  <span className="paused-session-status">Pausado</span>
                  <b>{session.content.name}</b>
                  <span className="paused-session-date">
                    {session.studyBlock
                      ? `Bloco de ${new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Sao_Paulo",
                        }).format(new Date(session.studyBlock.endsAt))}`
                      : "Estudo não planejado"}
                  </span>
                </div>
                <Link
                  className="paused-session-action"
                  href={`/app/session?id=${session.id}`}
                >
                  Continuar estudo <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {cancellation === "success" || cancellation === "uncovered" ? (
        <section className="dashboard-feedback" role="status">
          <div>
            <strong>
              {cancellation === "uncovered"
                ? "Bloco cancelado; conteúdo sem planejamento futuro."
                : "Bloco cancelado."}
            </strong>
            {cancellation === "uncovered" ? (
              <p>
                O conteúdo ainda não foi concluído e ficou sem blocos futuros.
                Você pode planejá-lo novamente quando desejar.
              </p>
            ) : null}
          </div>
          <Link href={`/app?week=${range.current}`}>Fechar</Link>
        </section>
      ) : null}
      <section className="metrics-strip" aria-label="Resumo da semana">
        <article>
          <span>Blocos cumpridos</span>
          <strong>
            {metrics?.compliance.percentage == null
              ? "—"
              : `${Math.round(metrics.compliance.percentage)}%`}
          </strong>
          <small>
            {metrics?.compliance.completedBlocks ?? 0} de{" "}
            {metrics?.compliance.eligibleBlocks ?? 0}
          </small>
        </article>
        <article>
          <span>Planejado × realizado</span>
          <strong>
            {durationLabel(metrics?.time.realizedCompletedSeconds ?? 0)}
          </strong>
          <small>
            de {durationLabel(metrics?.time.plannedCompletedSeconds ?? 0)} nos
            blocos concluídos
          </small>
        </article>
        <article
          className={
            (metrics?.adaptation.currentOverdueBlocks ?? 0) > 0
              ? "metric-alert"
              : ""
          }
        >
          <span>Atrasos identificados</span>
          <strong>{metrics?.adaptation.currentOverdueBlocks ?? 0}</strong>
          <small>blocos que precisam de atenção</small>
          {(metrics?.adaptation.currentOverdueBlocks ?? 0) > 0 ? (
            <Link href="/app/replanning">Ver sugestões →</Link>
          ) : null}
        </article>
        <article>
          <span>Estudo extra</span>
          <strong>
            {durationLabel(
              metrics?.time.additionalUnplanned.realizedSeconds ?? 0,
            )}
          </strong>
          <small>sessões fora do planejamento</small>
        </article>
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
            <div className="calendar-week-grid">
              {days.map((day) => {
                const items = calendar.filter(
                  (item) =>
                    brazilDateKey.format(new Date(item.startsAt)) === day.key,
                );
                return (
                  <section className="calendar-day" key={day.key}>
                    <header>
                      <time dateTime={day.key}>
                        {dayLabel.format(day.date)}
                      </time>
                      <span>{items.length || "—"}</span>
                    </header>
                    {items.length ? (
                      <div className="calendar-day-items">
                        {items.map((item) => (
                          <article
                            className={`calendar-item ${item.type} ${
                              item.type === "study_block"
                                ? `status-${item.status.toLowerCase()}`
                                : ""
                            }`}
                            key={`${item.type}-${item.id}`}
                          >
                            <time dateTime={item.startsAt}>
                              {timeOnly.format(new Date(item.startsAt))}
                              {item.endsAt
                                ? `–${timeOnly.format(new Date(item.endsAt))}`
                                : ""}
                            </time>
                            <div className="calendar-item-copy">
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
                              {item.type === "study_block" ? (
                                <>
                                  <span className="calendar-status">
                                    {blockStatusLabels[item.status] ??
                                      item.status}
                                  </span>
                                  <Link
                                    className="calendar-detail-link"
                                    href={`/app/blocks/${item.id}`}
                                  >
                                    Ver detalhes
                                  </Link>
                                </>
                              ) : (
                                <Link
                                  className="calendar-detail-link"
                                  href={`/app/subjects/${item.subject.id}/events?eventId=${item.id}#event-${item.id}`}
                                >
                                  Ver evento
                                </Link>
                              )}
                            </div>
                            {item.type === "study_block" &&
                            ["CONFIRMED", "OVERDUE"].includes(item.status) ? (
                              <BlockActions
                                blockId={item.id}
                                recurrenceSeriesId={item.recurrenceSeriesId}
                                canStart={!runningSession}
                                startIdempotencyKey={randomUUID()}
                                canEdit={
                                  item.status === "CONFIRMED" &&
                                  new Date(item.startsAt) > new Date()
                                }
                              />
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="calendar-day-empty">Livre</p>
                    )}
                  </section>
                );
              })}
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
