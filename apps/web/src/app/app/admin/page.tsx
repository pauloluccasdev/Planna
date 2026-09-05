import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";
import { AccountActions } from "./account-actions";

export const metadata: Metadata = { title: "Administração" };

type Props = {
  searchParams: Promise<{ query?: string; status?: string; cursor?: string }>;
};

type Account = {
  id: string;
  username: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export default async function AdminPage({ searchParams }: Props) {
  const filters = await searchParams;
  const parameters = new URLSearchParams();
  if (filters.query?.trim()) parameters.set("query", filters.query.trim());
  if (filters.status === "ACTIVE" || filters.status === "BLOCKED")
    parameters.set("status", filters.status);
  if (filters.cursor) parameters.set("cursor", filters.cursor);

  const [meResponse, accountsResponse] = await Promise.all([
    authenticatedApi("me"),
    authenticatedApi(`admin/users?${parameters.toString()}`),
  ]);
  if (!meResponse || meResponse.status === 401) redirect("/login");
  const me = (await meResponse.json()) as {
    data: { id: string; role: string };
  };
  if (me.data.role !== "ADMIN" || accountsResponse?.status === 403)
    redirect("/app");
  const accountPayload = accountsResponse?.ok
    ? ((await accountsResponse.json()) as {
        data: Account[];
        meta: { nextCursor: string | null };
      })
    : { data: [], meta: { nextCursor: null } };
  const accounts = accountPayload.data;
  const nextParameters = new URLSearchParams(parameters);
  if (accountPayload.meta.nextCursor)
    nextParameters.set("cursor", accountPayload.meta.nextCursor);

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
          <span className="eyebrow">Acesso restrito</span>
          <h1>Administração de contas</h1>
          <p>
            Consulte acessos sem visualizar cursos, conteúdos, agenda ou
            desempenho acadêmico.
          </p>
        </div>
      </section>
      <form className="admin-filters">
        <label className="field">
          <span>Buscar por usuário ou e-mail</span>
          <input defaultValue={filters.query} name="query" />
        </label>
        <label className="field">
          <span>Situação</span>
          <select defaultValue={filters.status ?? ""} name="status">
            <option value="">Todas</option>
            <option value="ACTIVE">Ativas</option>
            <option value="BLOCKED">Bloqueadas</option>
          </select>
        </label>
        <button className="button" type="submit">
          Filtrar
        </button>
      </form>
      <section className="admin-account-list" aria-label="Contas encontradas">
        {accounts.length ? (
          accounts.map((account) => (
            <article className="dashboard-card admin-account" key={account.id}>
              <div>
                <span className="resource-status">
                  {account.status === "ACTIVE" ? "Ativa" : "Bloqueada"} ·{" "}
                  {account.role === "ADMIN" ? "Administrador" : "Aluno"}
                </span>
                <h2>@{account.username}</h2>
                <p>{account.email}</p>
                <small>
                  Criada em {dateTime.format(new Date(account.createdAt))}
                  {account.lastLoginAt
                    ? ` · Último acesso ${dateTime.format(new Date(account.lastLoginAt))}`
                    : " · Ainda não acessou"}
                </small>
              </div>
              <AccountActions
                isCurrentUser={account.id === me.data.id}
                status={account.status}
                userId={account.id}
              />
            </article>
          ))
        ) : (
          <div className="dashboard-card resource-empty">
            <h2>Nenhuma conta encontrada.</h2>
            <p>Revise os filtros usados na busca.</p>
          </div>
        )}
      </section>
      {accountPayload.meta.nextCursor ? (
        <nav className="admin-pagination" aria-label="Paginação de contas">
          <Link
            className="secondary-button"
            href={`/app/admin?${nextParameters.toString()}`}
          >
            Próxima página
          </Link>
        </nav>
      ) : null}
    </main>
  );
}
