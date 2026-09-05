"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

const browserSnapshot = () => navigator.onLine;
const serverSnapshot = () => true;

export function ConnectivityStatus() {
  const online = useSyncExternalStore(
    subscribe,
    browserSnapshot,
    serverSnapshot,
  );
  if (online) return null;
  return (
    <aside className="connectivity-status" role="status" aria-live="polite">
      <span aria-hidden="true">!</span>
      <div>
        <strong>Você está sem conexão.</strong>
        <p>
          O Planna precisa de internet neste MVP. Suas informações salvas não
          foram alteradas.
        </p>
      </div>
    </aside>
  );
}
