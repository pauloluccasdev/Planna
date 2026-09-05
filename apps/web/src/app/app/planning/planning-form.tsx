"use client";

import { useActionState } from "react";
import { generatePlanningProposal, type PlanningFormState } from "./actions";

type CourseOption = {
  id: string;
  name: string;
  subjects: Array<{ id: string; name: string }>;
};

const initialState: PlanningFormState = {};

function todayInBrazil() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function PlanningForm({ courses }: { courses: CourseOption[] }) {
  const [state, action, pending] = useActionState(
    generatePlanningProposal,
    initialState,
  );
  const today = todayInBrazil();
  return (
    <form action={action} className="planning-form">
      <fieldset className="planning-fieldset">
        <legend>1. Período do planejamento</legend>
        <div className="planning-date-grid">
          <div className="field">
            <label htmlFor="planning-start">Começar em</label>
            <input
              id="planning-start"
              name="startDate"
              type="date"
              min={today}
              defaultValue={today}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="planning-end">Planejar até</label>
            <input
              id="planning-end"
              name="endDate"
              type="date"
              min={today}
              required
            />
          </div>
        </div>
        <p className="field-hint">
          Você pode planejar uma semana, um mês ou até o semestre letivo.
        </p>
      </fieldset>

      <fieldset className="planning-fieldset">
        <legend>2. O que deve entrar</legend>
        <p className="field-hint">
          Marque um curso inteiro ou escolha disciplinas específicas. Conteúdos
          atrasados também serão considerados automaticamente.
        </p>
        <div className="planning-scope-list">
          {courses.map((course) => (
            <article className="planning-scope" key={course.id}>
              <label className="check-row course-check">
                <input name="courseIds" type="checkbox" value={course.id} />
                <span>
                  <b>{course.name}</b>
                  <small>Incluir todas as disciplinas</small>
                </span>
              </label>
              {course.subjects.length > 0 ? (
                <div className="subject-checks">
                  {course.subjects.map((subject) => (
                    <label className="check-row" key={subject.id}>
                      <input
                        name="subjectIds"
                        type="checkbox"
                        value={subject.id}
                      />
                      <span>{subject.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <small>Nenhuma disciplina ativa neste curso.</small>
              )}
            </article>
          ))}
        </div>
      </fieldset>

      {state.message ? (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      ) : null}
      <button className="button" disabled={pending} type="submit">
        {pending ? "Analisando disponibilidade…" : "Gerar proposta"}
      </button>
      <p className="planning-safety-copy">
        Gerar uma proposta não altera sua agenda. Você poderá revisar tudo antes
        de confirmar.
      </p>
    </form>
  );
}
