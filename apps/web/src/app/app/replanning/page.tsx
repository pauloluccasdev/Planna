import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../_lib/api";
import { SuggestionCard } from "./suggestion-card";

export const metadata: Metadata = { title: "Replanejamento" };

type Suggestion = Parameters<typeof SuggestionCard>[0]["suggestion"];

export default async function ReplanningPage() {
  const response = await authenticatedApi("replanning-suggestions");
  if (!response || response.status === 401) redirect("/login");
  const suggestions = response.ok
    ? ((await response.json()) as { data: Suggestion[] }).data
    : [];
  const open = suggestions.filter((item) =>
    ["GENERATED", "EDITING"].includes(item.status),
  );
  const history = suggestions.filter((item) =>
    ["ACCEPTED", "REJECTED"].includes(item.status),
  );

  return (
    <main className="dashboard-shell replanning-shell">
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
          <span className="eyebrow">Planejamento adaptativo</span>
          <h1>Replanejamento</h1>
          <p>
            O Planna calcula alternativas, mas sua agenda só muda depois da sua
            confirmação.
          </p>
        </div>
      </section>
      <section className="replanning-section">
        <div className="card-heading">
          <h2>Aguardando sua decisão</h2>
          <span>{open.length}</span>
        </div>
        {open.length ? (
          <div className="replanning-list">
            {open.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>Em dia</span>
            <h3>Nenhuma sugestão pendente.</h3>
            <p>Quando um bloco atrasar, uma alternativa aparecerá aqui.</p>
          </div>
        )}
      </section>
      {history.length ? (
        <section className="replanning-section">
          <div className="card-heading">
            <h2>Histórico</h2>
            <span>{history.length}</span>
          </div>
          <div className="replanning-list history">
            {history.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
