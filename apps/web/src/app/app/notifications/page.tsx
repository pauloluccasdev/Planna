import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";
import { markNotificationRead } from "./actions";

export const metadata: Metadata = { title: "Notificações" };

type NotificationItem = {
  id: string;
  kind:
    | "STUDY_BLOCK_REMINDER"
    | "ACADEMIC_EVENT_REMINDER"
    | "RISK_ALERT"
    | "OVERDUE_BLOCK"
    | "REPLANNING_SUGGESTION";
  relatedType: string | null;
  relatedId: string | null;
  scheduledFor: string;
  status: "SCHEDULED" | "SENT" | "FAILED" | "CANCELLED" | "READ";
};

const labels: Record<NotificationItem["kind"], string> = {
  STUDY_BLOCK_REMINDER: "Lembrete de estudo",
  ACADEMIC_EVENT_REMINDER: "Compromisso acadêmico",
  RISK_ALERT: "Atenção ao planejamento",
  OVERDUE_BLOCK: "Bloco atrasado",
  REPLANNING_SUGGESTION: "Sugestão de replanejamento",
};
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type Props = { searchParams: Promise<{ cursor?: string }> };

export default async function NotificationsPage({ searchParams }: Props) {
  const { cursor } = await searchParams;
  const response = await authenticatedApi(
    `notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
  );
  if (!response || response.status === 401) redirect("/login");
  const result = response.ok
    ? (
        (await response.json()) as {
          data: { items: NotificationItem[]; nextCursor: string | null };
        }
      ).data
    : { items: [], nextCursor: null };

  return (
    <main className="dashboard-shell notifications-shell">
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
          <span className="eyebrow">Atualizações do Planna</span>
          <h1>Notificações</h1>
          <p>Seus lembretes e alertas aparecerão aqui quando forem emitidos.</p>
        </div>
        <Link className="secondary-button" href="/app/settings/study">
          Configurar navegador
        </Link>
      </section>
      {result.items.length ? (
        <section className="notification-list">
          {result.items.map((item) => (
            <article
              className={`dashboard-card notification-row ${item.status === "READ" ? "is-read" : ""}`}
              key={item.id}
            >
              <div>
                <span className="resource-status">
                  {item.status === "READ" ? "Lida" : "Nova"}
                </span>
                <h2>{labels[item.kind]}</h2>
                <time dateTime={item.scheduledFor}>
                  {dateTime.format(new Date(item.scheduledFor))}
                </time>
              </div>
              {item.status !== "READ" && item.status !== "CANCELLED" ? (
                <form action={markNotificationRead.bind(null, item.id)}>
                  <button className="secondary-button" type="submit">
                    Marcar como lida
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="dashboard-card resource-empty notification-empty">
          <span>Sem novidades</span>
          <h2>Sua caixa está vazia.</h2>
          <p>Você pode continuar usando todo o Planna normalmente.</p>
        </section>
      )}
      {result.nextCursor ? (
        <div className="admin-pagination">
          <Link
            className="secondary-button"
            href={`/app/notifications?cursor=${result.nextCursor}`}
          >
            Ver notificações anteriores
          </Link>
        </div>
      ) : null}
    </main>
  );
}
