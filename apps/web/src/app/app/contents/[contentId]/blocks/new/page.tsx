import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../../../_lib/api";
import { BlockForm } from "./block-form";

type Props = { params: Promise<{ contentId: string }> };
type Content = { id: string; name: string; priority: number };
type Part = { id: string; name: string };
type Pomodoro = { focusSeconds: number; breakSeconds: number } | null;

export const metadata: Metadata = { title: "Novo bloco" };

function localDateTime(hoursAhead: number) {
  const value = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(value)
    .replace(" ", "T");
}

export default async function NewBlockPage({ params }: Props) {
  const { contentId } = await params;
  const [contentResponse, partsResponse, pomodoroResponse] = await Promise.all([
    authenticatedApi(`contents/${contentId}`),
    authenticatedApi(`contents/${contentId}/parts`),
    authenticatedApi("pomodoro-preference"),
  ]);
  if (!contentResponse || contentResponse.status === 401) redirect("/login");
  if (contentResponse.status === 404) notFound();
  if (!contentResponse.ok)
    throw new Error("Não foi possível carregar o conteúdo.");
  const content = ((await contentResponse.json()) as { data: Content }).data;
  const parts = partsResponse?.ok
    ? ((await partsResponse.json()) as { data: Part[] }).data
    : [];
  const pomodoro = pomodoroResponse?.ok
    ? ((await pomodoroResponse.json()) as { data: Pomodoro }).data
    : null;
  return (
    <main className="dashboard-shell narrow-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <Link className="back-link" href={`/app/contents/${contentId}`}>
          Cancelar
        </Link>
      </header>
      <section className="resource-heading block-heading">
        <div>
          <span className="eyebrow">Novo bloco manual</span>
          <h1>{content.name}</h1>
          <p>O bloco só será salvo na agenda depois desta confirmação.</p>
        </div>
      </section>
      <section className="dashboard-card block-form-card">
        <BlockForm
          contentId={contentId}
          parts={parts}
          focusSeconds={pomodoro?.focusSeconds ?? 1500}
          breakSeconds={pomodoro?.breakSeconds ?? 300}
          defaultStartsAt={localDateTime(24)}
          defaultEndsAt={localDateTime(25)}
        />
      </section>
    </main>
  );
}
