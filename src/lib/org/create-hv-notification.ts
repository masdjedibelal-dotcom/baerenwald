import { buildPushPayloadFromNotif } from "@/lib/push/payload";
import { resolveOrgAuthUserIds } from "@/lib/push/resolve-recipients";
import { scheduleWebPushToUsers } from "@/lib/push/send-web-push";
import { supabaseAdmin } from "@/lib/supabase";

export type CreateHvNotificationInput = {
  kundeId: string;
  typ: string;
  titel: string;
  body: string;
  link: string;
};

/**
 * HV-Glocke + Web-Push an alle Org-Auth-User (Haupt + Mitglieder).
 * Fail-soft beim Push.
 */
export async function createHvNotification(
  input: CreateHvNotificationInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const kundeId = input.kundeId.trim();
  if (!kundeId) return { ok: false, error: "kundeId fehlt." };

  const titel = input.titel.trim();
  const body = input.body.trim();
  const link = input.link.trim();
  const typ = input.typ.trim() || "info";

  const { error } = await supabaseAdmin.from("hv_notifications").insert({
    kunde_id: kundeId,
    typ,
    titel,
    body,
    link,
  });
  if (error) return { ok: false, error: error.message };

  void resolveOrgAuthUserIds(kundeId)
    .then((userIds) => {
      if (!userIds.length) return;
      scheduleWebPushToUsers(
        userIds,
        buildPushPayloadFromNotif({
          typ,
          titel,
          body,
          link,
          defaultUrl: "/portal",
        })
      );
    })
    .catch((e) => console.error("[createHvNotification] push:", e));

  return { ok: true };
}
