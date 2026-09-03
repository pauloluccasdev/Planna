"use client";

import { useActionState } from "react";
import { savePomodoro, type SettingsState } from "./actions";

const initialState: SettingsState = {};

export function PomodoroForm({
  focusSeconds,
  breakSeconds,
}: {
  focusSeconds: number;
  breakSeconds: number;
}) {
  const [state, action, pending] = useActionState(savePomodoro, initialState);
  return (
    <form action={action} className="pomodoro-form">
      <div className="form-columns">
        <div className="field">
          <label htmlFor="focus-minutes">Tempo de foco</label>
          <div className="unit-input">
            <input
              id="focus-minutes"
              name="focusMinutes"
              type="number"
              min="1"
              step="1"
              defaultValue={focusSeconds / 60}
              required
            />
            <span>min</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="break-minutes">Tempo de pausa</label>
          <div className="unit-input">
            <input
              id="break-minutes"
              name="breakMinutes"
              type="number"
              min="1"
              step="1"
              defaultValue={breakSeconds / 60}
              required
            />
            <span>min</span>
          </div>
        </div>
      </div>
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      {state.success && <p className="form-success">{state.success}</p>}
      <button
        className="button settings-submit"
        disabled={pending}
        type="submit"
      >
        {pending ? "Salvando…" : "Salvar Pomodoro"}
      </button>
    </form>
  );
}
