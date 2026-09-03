import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticatedApi } from "../../../_lib/api";
import { AvailabilityForm } from "./availability-form";
import { PomodoroForm } from "./pomodoro-form";

export const metadata: Metadata = { title: "Configuração de estudo" };

type Interval = {
  id: string;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
};
type Pomodoro = { focusSeconds: number; breakSeconds: number } | null;

export default async function StudySettingsPage() {
  const [availabilityResponse, pomodoroResponse] = await Promise.all([
    authenticatedApi("availability"),
    authenticatedApi("pomodoro-preference"),
  ]);
  if (!availabilityResponse || availabilityResponse.status === 401)
    redirect("/login");
  const intervals = availabilityResponse.ok
    ? ((await availabilityResponse.json()) as { data: Interval[] }).data
    : [];
  const pomodoro = pomodoroResponse?.ok
    ? ((await pomodoroResponse.json()) as { data: Pomodoro }).data
    : null;
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
      <section className="resource-heading settings-heading">
        <div>
          <span className="eyebrow">Configuração de estudo</span>
          <h1>Quando você pode estudar?</h1>
          <p>O Planna só utilizará horários que você disponibilizar.</p>
        </div>
      </section>
      <section className="settings-stack">
        <article className="dashboard-card settings-card">
          <div className="settings-card-heading">
            <div>
              <span className="eyebrow">Grade semanal</span>
              <h2>Disponibilidade</h2>
            </div>
            <span>Horário de Brasília</span>
          </div>
          <AvailabilityForm initial={intervals} />
        </article>
        <article className="dashboard-card settings-card compact-settings">
          <div className="settings-card-heading">
            <div>
              <span className="eyebrow">Cronômetro</span>
              <h2>Pomodoro padrão</h2>
            </div>
            <p>Você poderá alterar estes tempos em cada bloco.</p>
          </div>
          <PomodoroForm
            focusSeconds={pomodoro?.focusSeconds ?? 1500}
            breakSeconds={pomodoro?.breakSeconds ?? 300}
          />
        </article>
      </section>
    </main>
  );
}
