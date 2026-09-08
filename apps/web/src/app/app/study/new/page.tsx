import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { StudyForms } from "./study-forms";

export const metadata: Metadata = { title: "Registrar estudo" };

type Content = {
  id: string;
  name: string;
  subject: { name: string; course: { name: string } };
  parts: Array<{ id: string; name: string }>;
};
type StudyBlock = {
  id: string;
  contentId: string;
  startsAt: string;
  status: string;
};

export default async function NewStudyPage() {
  const [contentsResponse, blocksResponse] = await Promise.all([
    authenticatedApi("contents"),
    authenticatedApi("study-blocks?retroactiveEligible=true"),
  ]);
  if (!contentsResponse || contentsResponse.status === 401) redirect("/login");
  const contents = contentsResponse.ok
    ? ((await contentsResponse.json()) as { data: Content[] }).data
    : [];
  const blocks = blocksResponse?.ok
    ? ((await blocksResponse.json()) as { data: StudyBlock[] }).data
    : [];
  return (
    <main className="dashboard-shell study-entry-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>Planna
        </Link>
        <Link className="back-link" href="/app">
          Voltar à agenda
        </Link>
      </header>
      <section className="resource-heading">
        <div>
          <span className="eyebrow">Tempo efetivo</span>
          <h1>Registrar estudo</h1>
          <p>
            O Planna contabiliza tanto o que estava planejado quanto o que
            aconteceu fora da agenda.
          </p>
        </div>
      </section>
      {contents.length ? (
        <StudyForms
          contents={contents}
          retroactiveBlocks={blocks}
          liveIdempotencyKey={randomUUID()}
          retroactiveIdempotencyKey={randomUUID()}
        />
      ) : (
        <section className="dashboard-card study-entry-empty">
          <span className="study-entry-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
              <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22V5.5Z" />
            </svg>
          </span>
          <div className="study-entry-empty-copy">
            <span className="eyebrow">Primeiro passo</span>
            <h2>Cadastre um conteúdo para começar</h2>
            <p>
              Toda sessão precisa estar vinculada ao conteúdo estudado. Assim,
              seu tempo e seu progresso ficam registrados corretamente.
            </p>
          </div>
          <Link className="button study-entry-empty-action" href="/app/courses">
            Cadastrar conteúdo <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </main>
  );
}
