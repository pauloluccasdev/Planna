"use client";

import { useActionState, useState } from "react";
import { saveAvailability, type SettingsState } from "./actions";

type Interval = {
  id?: string;
  weekday: number;
  startLocalTime: string;
  endLocalTime: string;
};

const dayNames = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const initialState: SettingsState = {};

export function AvailabilityForm({ initial }: { initial: Interval[] }) {
  const [rows, setRows] = useState(() =>
    initial.map((interval, index) => ({
      ...interval,
      key: interval.id ?? `initial-${index}`,
    })),
  );
  const [copyMessage, setCopyMessage] = useState<string>();
  const [state, action, pending] = useActionState(
    saveAvailability,
    initialState,
  );
  function add(weekday: number) {
    setRows((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        weekday,
        startLocalTime: "19:00",
        endLocalTime: "21:00",
      },
    ]);
  }
  function update(
    key: string,
    field: "startLocalTime" | "endLocalTime",
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  }
  function copyToOtherDays(source: (typeof rows)[number]) {
    setRows((current) => {
      const additions = dayNames.flatMap((_, weekday) => {
        const alreadyExists = current.some(
          (row) =>
            row.weekday === weekday &&
            row.startLocalTime.slice(0, 5) ===
              source.startLocalTime.slice(0, 5) &&
            row.endLocalTime.slice(0, 5) === source.endLocalTime.slice(0, 5),
        );
        return alreadyExists
          ? []
          : [
              {
                key: crypto.randomUUID(),
                weekday,
                startLocalTime: source.startLocalTime.slice(0, 5),
                endLocalTime: source.endLocalTime.slice(0, 5),
              },
            ];
      });
      return [...current, ...additions];
    });
    setCopyMessage(
      `Horário de ${source.startLocalTime.slice(0, 5)} às ${source.endLocalTime.slice(0, 5)} replicado nos demais dias.`,
    );
  }
  return (
    <form action={action} className="availability-form">
      <div className="week-settings">
        {dayNames.map((name, weekday) => {
          const dayRows = rows.filter((row) => row.weekday === weekday);
          return (
            <section className="day-setting" key={name}>
              <div className="day-setting-heading">
                <strong>{name}</strong>
                <button type="button" onClick={() => add(weekday)}>
                  + intervalo
                </button>
              </div>
              {dayRows.length === 0 ? (
                <span className="day-off">Sem disponibilidade</span>
              ) : (
                dayRows.map((row) => (
                  <div className="time-row" key={row.key}>
                    <input type="hidden" name="weekday" value={weekday} />
                    <label>
                      <span>Início</span>
                      <input
                        name="startLocalTime"
                        type="time"
                        value={row.startLocalTime.slice(0, 5)}
                        onChange={(event) =>
                          update(row.key, "startLocalTime", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      <span>Fim</span>
                      <input
                        name="endLocalTime"
                        type="time"
                        value={row.endLocalTime.slice(0, 5)}
                        onChange={(event) =>
                          update(row.key, "endLocalTime", event.target.value)
                        }
                        required
                      />
                    </label>
                    <div className="time-row-actions">
                      <button
                        className="copy-time"
                        type="button"
                        aria-label={`Replicar este horário de ${name} nos demais dias`}
                        title="Replicar nos demais dias"
                        onClick={() => copyToOtherDays(row)}
                      >
                        <span aria-hidden="true">⧉</span> Replicar
                      </button>
                      <button
                        className="remove-time"
                        type="button"
                        aria-label={`Remover intervalo de ${name}`}
                        onClick={() =>
                          setRows((current) =>
                            current.filter((item) => item.key !== row.key),
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
      {copyMessage ? (
        <p className="availability-copy-message" role="status">
          {copyMessage}
        </p>
      ) : null}
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
        {pending ? "Salvando…" : "Salvar disponibilidade"}
      </button>
    </form>
  );
}
