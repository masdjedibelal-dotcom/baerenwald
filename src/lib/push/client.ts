"use client";

import type { PushPortalScope, PushSubscriptionJSON } from "@/lib/push/types";

const SW_PATH = "/sw.js";

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isPushClientSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS: Push nur in installierter PWA. */
export function canRequestPushPermission(): {
  ok: boolean;
  reason: "ok" | "unsupported" | "ios_needs_pwa" | "blocked";
} {
  if (!isPushClientSupported()) {
    return { ok: false, reason: "unsupported" };
  }
  if (isIosDevice() && !isStandaloneDisplay()) {
    return { ok: false, reason: "ios_needs_pwa" };
  }
  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    return { ok: false, reason: "blocked" };
  }
  return { ok: true, reason: "ok" };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-public-key");
  const json = (await res.json()) as { publicKey?: string; error?: string };
  if (!res.ok || !json.publicKey) {
    throw new Error(json.error || "VAPID-Key fehlt.");
  }
  return json.publicKey;
}

export async function subscribeWebPush(
  portal: PushPortalScope
): Promise<PushSubscriptionJSON> {
  const gate = canRequestPushPermission();
  if (!gate.ok) {
    throw new Error(
      gate.reason === "ios_needs_pwa"
        ? "Bitte zuerst zum Home-Bildschirm hinzufügen."
        : gate.reason === "blocked"
          ? "Benachrichtigungen sind im Browser blockiert."
          : "Push wird auf diesem Gerät nicht unterstützt."
    );
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Berechtigung nicht erteilt.");
  }

  const reg = await ensureServiceWorker();
  const vapidKey = await fetchVapidPublicKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Ungültige Subscription.");
  }

  const payload: PushSubscriptionJSON = {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: payload,
      portal,
      userAgent: navigator.userAgent,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error || "Subscribe fehlgeschlagen.");
  return payload;
}

export async function unsubscribeWebPush(): Promise<void> {
  if (!isPushClientSupported()) {
    await fetch("/api/push/unsubscribe", { method: "POST" });
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      return;
    }
  } catch {
    /* ignore */
  }
  await fetch("/api/push/unsubscribe", { method: "POST" });
}

export async function setPushEnabled(
  enabled: boolean,
  portal: PushPortalScope
): Promise<void> {
  if (enabled) {
    await subscribeWebPush(portal);
    const res = await fetch("/api/push/prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ push_enabled: true }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error || "Speichern fehlgeschlagen.");
    }
    return;
  }
  await unsubscribeWebPush();
  const res = await fetch("/api/push/prefs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ push_enabled: false }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Speichern fehlgeschlagen.");
  }
}
