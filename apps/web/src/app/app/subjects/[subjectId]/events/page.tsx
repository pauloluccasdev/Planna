import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authenticatedApi } from "../../../../_lib/api";
import { removeAcademicEvent } from "./actions";
import { EventForm } from "./event-form";
import { EventEditor } from "./event-editor";
import { EventTypeForm } from "./event-type-form";

export const metadata: Metadata = { title: "Compromissos acadêmicos" };

type Props = { params: Promise<{ subjectId: string }> };
type Subject = { id: string; name: string; courseId: string };
type EventType = { id: string; name: string; isSystem: boolean };
type Content = { id: string; name: string };
type AcademicEvent = {
  id: string;
  eventTypeId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  contentsStatus: "INFORMED" | "NOT_INFORMED_YET";
  eventType: { name: string };
  contentLinks: Array<{ content: { id: string; name: string } }>;
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

export default async function EventsPage({ params }: Props) {
  const { subjectId } = await params;
  const [subjectResponse, typesResponse, contentsResponse, eventsResponse] =
    await Promise.all([
      authenticatedApi(`subjects/${subjectId}`),
      authenticatedApi("academic-event-types"),
      authenticatedApi(`subjects/${subjectId}/contents`),
      authenticatedApi(`academic-events?subjectId=${subjectId}`),
    ]);
  if (!subjectResponse || subjectResponse.status === 401) redirect("/login");
  if (subjectResponse.status === 404) notFound();
  if (!subjectResponse.ok)
    throw new Error("Não foi possível carregar a disciplina.");
  const subject = ((await subjectResponse.json()) as { data: Subject }).data;
  const eventTypes = typesResponse?.ok
    ? ((await typesResponse.json()) as { data: EventType[] }).data
    : [];
  const contents = contentsResponse?.ok
    ? ((await contentsResponse.json()) as { data: Content[] }).data
    : [];
  const events = eventsResponse?.ok
    ? ((await eventsResponse.json()) as { data: AcademicEvent[] }).data
    : [];

  return (
    <main className="dashboard-shell events-shell">
      <header className="dashboard-header">
        <Link className="brand" href="/app">
          <span className="brand-mark">P</span>Planna
        </Link>
        <Link className="back-link" href={`/app/subjects/${subjectId}`}>
          Voltar aos conteúdos
        </Link>
      </header>
      <section className="resource-heading">
        <div>
          <span className="eyebrow">Compromissos acadêmicos</span>
          <h1>{subject.name}</h1>
          <p>
            Provas, trabalhos e outros eventos influenciam a prioridade do
            planejamento.
          </p>
        </div>
      </section>
      <section className="events-layout">
        <div className="resource-list">
          {events.length ? (
            events.map((event) => (
              <article className="dashboard-card event-row" key={event.id}>
                <div className="event-row-heading">
                  <div>
                    <span className="resource-status">
                      {event.eventType.name}
                    </span>
                    <h2>{event.title}</h2>
                  </div>
                  <form
                    action={removeAcademicEvent.bind(null, subjectId, event.id)}
                  >
                    <button className="remove-event" type="submit">
                      Remover
                    </button>
                  </form>
                </div>
                <time dateTime={event.startsAt}>
                  {dateTime.format(new Date(event.startsAt))}
                </time>
                <p>
                  {event.contentsStatus === "NOT_INFORMED_YET"
                    ? "Conteúdos ainda não informados"
                    : event.contentLinks
                        .map((link) => link.content.name)
                        .join(", ")}
                </p>
                <EventEditor
                  subjectId={subjectId}
                  event={event}
                  eventTypes={eventTypes}
                  contents={contents}
                />
              </article>
            ))
          ) : (
            <div className="dashboard-card resource-empty">
              <h2>Nenhum compromisso cadastrado.</h2>
              <p>Adicione as datas já divulgadas no calendário letivo.</p>
            </div>
          )}
          <div className="dashboard-card custom-type-card">
            <EventTypeForm subjectId={subjectId} />
          </div>
        </div>
        <aside className="dashboard-card event-create-card">
          <span className="eyebrow">Novo compromisso</span>
          <EventForm
            subjectId={subjectId}
            eventTypes={eventTypes}
            contents={contents}
          />
        </aside>
      </section>
    </main>
  );
}
