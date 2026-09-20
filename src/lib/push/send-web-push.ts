import { logDbError } from '@/lib/errors/log-db-error'
import webpush from "web-push";

import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isPushServerConfigured,
} from "@/lib/push/vapid";
import type { PushPayload } from "@/lib/push/types";
import { supabaseAdmin } from "@/lib/supabase";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (!isPushServerConfigured()) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      getVapidSubject(),
      getVapidPublicKey()!,
      getVapidPrivateKey()!
    );
    vapidConfigured = true;
  }
  return true;
}

/**
 * Sendet Web-Push an alle Geräte der User mit `push_enabled`.
 * Fail-soft: nie werfen; tote Endpoints werden entfernt.
 */
export async function sendWebPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; skipped: number }> {
  const unique = Array.from(
    new Set(userIds.map((id) => id.trim()).filter(Boolean))
  );
  if (!unique.length || !ensureVapid()) {
    return { sent: 0, skipped: unique.length };
  }

  const {data: prefs, error: __dbErr497_1} = await supabaseAdmin
    .from("push_prefs")
    .select("auth_user_id, push_enabled")
    .in("auth_user_id", unique);
  if (__dbErr497_1) logDbError('lib/push/send-web-push:push_prefs', __dbErr497_1)
  const enabled = new Set(
    (prefs ?? [])
      .filter((p) => p.push_enabled)
      .map((p) => String(p.auth_user_id))
  );
  if (!enabled.size) return { sent: 0, skipped: unique.length };

  const enabledIds = Array.from(enabled);
  const {data: subs, error: __dbErr498_2} = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, auth_user_id")
    .in("auth_user_id", enabledIds);
  if (__dbErr498_2) logDbError('lib/push/send-web-push:push_subscriptions', __dbErr498_2)
  if (!subs?.length) return { sent: 0, skipped: unique.length };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag ?? "baerenwald",
  });

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "normal" }
        );
        sent += 1;
      } catch (e) {
        const status =
          e && typeof e === "object" && "statusCode" in e
            ? Number((e as { statusCode?: number }).statusCode)
            : 0;
        if (status === 404 || status === 410) {
          staleIds.push(String(sub.id));
        } else {
          console.warn("[push] send failed:", status || e);
        }
      }
    })
  );

  if (staleIds.length) {
    const { error: __dbErr499_3 } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("id", staleIds);
    if (__dbErr499_3) logDbError('lib/push/send-web-push:push_subscriptions', __dbErr499_3)
  }

  return { sent, skipped: unique.length - enabled.size };
}

/** Convenience: Push nach In-App-Notification (fail-soft). */
export function scheduleWebPushToUsers(
  userIds: string[],
  payload: PushPayload
): void {
  void sendWebPushToUsers(userIds, payload).catch((e) =>
    console.error("[push] schedule:", e)
  );
}
