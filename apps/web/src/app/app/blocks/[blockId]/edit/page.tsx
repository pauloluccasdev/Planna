import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../../_lib/api";
import { BlockEditForm } from "./block-edit-form";

type Props = { params: Promise<{ blockId: string }> };

type Content = {
  id: string;
  name: string;
  subject: { name: string; course: { name: string } };
  parts: Array<{ id: string; name: string }>;
};

type Block = {
  id: string;
  contentId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  focusSeconds: number;
  breakSeconds: number;
  revision: number;
  recurrenceSeriesId: string | null;
  content: { name: string };
  parts: Array<{ contentPart: { id: string } }>;
};

type BlockVersion = {
  id: string;
  versionNumber: number;
  changedAt: string;
  changeReason: string | null;
};

export const metadata: Metadata = { title: "Editar bloco" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export default async function EditBlockPage({ params }: Props) {
  const { blockId } = await params;
  const [blockResponse, contentsResponse, historyResponse] = await Promise.all([
    authenticatedApi(`study-blocks/${blockId}`),
    authenticatedApi("contents"),
    authenticatedApi(`study-blocks/${blockId}/history`),
  ]);
  if (!blockResponse || blockResponse.status === 401) redirect("/login");
  if (blockResponse.status === 404) notFound();
  if (!blockResponse.ok) throw new Error("Não foi possível carregar o bloco.");
  const block = ((await blockResponse.json()) as { data: Block }).data;
  const contents = contentsResponse?.ok
    ? ((await contentsResponse.json()) as { data: Content[] }).data
    : [];
  const history = historyResponse?.ok
    ? ((await historyResponse.json()) as { data: BlockVersion[] }).data
    : [];

  return (
    <main className="dashboard-shell narrow-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href="/app">
          Cancelar
        </Link>
      </header>
      <section className="resource-heading block-heading">
        <div>
          <span className="eyebrow">Editar bloco confirmado</span>
          <h1>{block.content.name}</h1>
          <p>O estado atual será preservado no histórico antes da alteração.</p>
        </div>
      </section>
      {block.status === "CONFIRMED" && new Date(block.startsAt) > new Date() ? (
        <section className="dashboard-card block-form-card">
          <BlockEditForm block={block} contents={contents} />
        </section>
      ) : (
        <section className="dashboard-card resource-empty">
          <h2>Este bloco não pode mais ser editado.</h2>
          <p>Somente blocos futuros confirmados aceitam alterações.</p>
        </section>
      )}
      <section className="block-history">
        <span className="eyebrow">Histórico de alterações</span>
        {history.length ? (
          <ol>
            {history.map((version) => (
              <li className="dashboard-card" key={version.id}>
                <b>Versão {version.versionNumber}</b>
                <time dateTime={version.changedAt}>
                  {dateTime.format(new Date(version.changedAt))}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>Nenhuma alteração anterior.</p>
        )}
      </section>
    </main>
  );
}
