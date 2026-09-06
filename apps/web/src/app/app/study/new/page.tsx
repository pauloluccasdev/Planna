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
        <section className="dashboard-card resource-empty">
          <h2>Cadastre um conteúdo primeiro.</h2>
          <p>Uma sessão sempre precisa estar vinculada ao conteúdo estudado.</p>
          <Link className="button" href="/app/courses">
            Organizar estudos
          </Link>
        </section>
      )}
    </main>
  );
}
