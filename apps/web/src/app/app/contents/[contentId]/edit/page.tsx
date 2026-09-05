import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../../_lib/api";
import { ContentEditForm } from "./content-edit-form";

export const metadata: Metadata = { title: "Editar conteúdo" };

type Props = { params: Promise<{ contentId: string }> };
type Content = {
  id: string;
  subjectId: string;
  name: string;
  description: string | null;
  priority: number;
  estimatedDurationSeconds: number | null;
};

export default async function EditContentPage({ params }: Props) {
  const { contentId } = await params;
  const response = await authenticatedApi(`contents/${contentId}`);
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Não foi possível carregar o conteúdo.");
  const content = ((await response.json()) as { data: Content }).data;
  return (
    <main className="dashboard-shell narrow-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>Planna
        </Link>
        <Link className="back-link" href={`/app/contents/${content.id}`}>
          Cancelar
        </Link>
      </header>
      <section className="resource-heading block-heading">
        <div>
          <span className="eyebrow">Editar conteúdo</span>
          <h1>{content.name}</h1>
          <p>
            A prioridade continua obrigatória e pode ser ajustada a qualquer
            momento.
          </p>
        </div>
      </section>
      <section className="dashboard-card content-edit-card">
        <ContentEditForm content={content} />
      </section>
    </main>
  );
}
