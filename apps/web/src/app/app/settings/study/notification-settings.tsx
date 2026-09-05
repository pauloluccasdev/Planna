"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import {
  registerPushSubscription,
  revokePushSubscription,
} from "./notification-actions";

const storedSubscriptionId = "planna.push-subscription-id";
const noBrowserSubscription = () => () => {};
const browserPushSupported = () =>
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;
const serverPushSupported = () => false;

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function subscriptionPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}

export function NotificationSettings({ publicKey }: { publicKey: string }) {
  const configured = Boolean(publicKey);
  const supported = useSyncExternalStore(
    noBrowserSubscription,
    browserPushSupported,
    serverPushSupported,
  );
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!supported) return;
    void navigator.serviceWorker.ready
      .then(async (registration) => ({
        permission: Notification.permission,
        subscription: await registration.pushManager.getSubscription(),
      }))
      .then((state) => {
        setPermission(state.permission);
        setSubscribed(Boolean(state.subscription));
      })
      .catch(() => setSubscribed(false));
  }, [supported]);

  function enable() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setMessage(
            "A permissão não foi concedida. O restante do Planna continua funcionando normalmente.",
          );
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey(publicKey),
          }));
        const payload = subscriptionPayload(subscription);
        if (!payload) throw new Error("invalid subscription");
        const saved = await registerPushSubscription(payload);
        if (!saved.id) throw new Error(saved.message);
        window.localStorage.setItem(storedSubscriptionId, saved.id);
        setSubscribed(true);
        setMessage("Este navegador está preparado para receber notificações.");
      } catch {
        setMessage("Não foi possível ativar as notificações neste navegador.");
      }
    });
  }

  function disable() {
    setMessage("");
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        let id = window.localStorage.getItem(storedSubscriptionId);
        if (!id && subscription) {
          const payload = subscriptionPayload(subscription);
          if (payload)
            id = (await registerPushSubscription(payload)).id ?? null;
        }
        if (id) await revokePushSubscription(id);
        if (subscription) await subscription.unsubscribe();
        window.localStorage.removeItem(storedSubscriptionId);
        setSubscribed(false);
        setMessage("Notificações desativadas neste navegador.");
      } catch {
        setMessage("Não foi possível desativar as notificações agora.");
      }
    });
  }

  if (!supported)
    return (
      <p className="field-help">
        Este navegador não oferece notificações push. As demais funções seguem
        disponíveis.
      </p>
    );
  if (!configured)
    return (
      <p className="field-help">
        O canal de envio ainda não foi configurado neste ambiente. Nenhuma
        permissão será solicitada por enquanto.
      </p>
    );

  return (
    <div className="notification-settings-control">
      <div>
        <strong>{subscribed ? "Ativadas" : "Desativadas"}</strong>
        <span>
          Permissão do navegador:{" "}
          {permission === "granted"
            ? "concedida"
            : permission === "denied"
              ? "bloqueada"
              : "ainda não solicitada"}
        </span>
      </div>
      <button
        className={subscribed ? "danger-button" : "button"}
        disabled={pending}
        onClick={subscribed ? disable : enable}
        type="button"
      >
        {pending
          ? "Aguarde…"
          : subscribed
            ? "Desativar neste navegador"
            : "Ativar notificações"}
      </button>
      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
