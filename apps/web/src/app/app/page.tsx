import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../_lib/api";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Minha semana" };

type MeResponse = {
  data: { username: string; email: string; role: string };
};

function weekRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 7);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default async function DashboardPage() {
  const range = weekRange();
  const [meResponse, calendarResponse] = await Promise.all([
    authenticatedApi("me"),
    authenticatedApi(
      `calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    ),
  ]);
  if (!meResponse?.ok) redirect("/login");
  const { data: user } = (await meResponse.json()) as MeResponse;
  const calendar = calendarResponse?.ok
    ? ((await calendarResponse.json()) as { data: unknown[] }).data
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
            <span>{calendar.length} itens</span>
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
            <p className="loaded-state">
              Sua agenda possui {calendar.length} itens nesta semana.
            </p>
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
          </ol>
        </aside>
      </section>
    </main>
  );
}
