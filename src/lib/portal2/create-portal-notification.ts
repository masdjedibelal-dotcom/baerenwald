import { supabaseAdmin } from "@/lib/supabase";
import {
  formatPortalNotifTemplate,
  resolvePortalNotifVisual,
  type PortalNotifRole,
  type PortalNotifTemplateVars,
  type PortalNotifTyp,
  PORTAL_NOTIF_TEMPLATES,
} from "@/lib/portal2/notif-types";

export type CreatePortalNotificationInput = {
  empfaengerUserId: string;
  typ: PortalNotifTyp;
  role?: PortalNotifRole;
  /** Überschreibt Katalog-Titel */
  titel?: string;
  /** Fertiger Text — sonst Template aus Rolle+Typ */
  text?: string;
  templateVars?: PortalNotifTemplateVars;
  vorgangRef?: string | null;
  link?: string | null;
};

/**
 * Schreibt in `portal_notifications` (B4).
 * Quelle: CRM-Status-Sync, Freigabe, Termin, Bautagebuch, HW-Angebot.
 * No-op-sicher wenn Tabelle noch nicht migriert (Fehler zurückgeben).
 */
export async function createPortalNotification(
  input: CreatePortalNotificationInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const visual = resolvePortalNotifVisual(input.typ, input.role);
  const titel = input.titel?.trim() || visual.title;

  let body = input.text?.trim() ?? "";
  if (!body && input.role) {
    const roleTemplates = PORTAL_NOTIF_TEMPLATES[input.role] as
      | Partial<Record<PortalNotifTyp, string>>
      | undefined;
    const tpl = roleTemplates?.[input.typ];
    if (tpl) {
      body = formatPortalNotifTemplate(tpl, input.templateVars ?? {});
    }
  }

  const { data, error } = await supabaseAdmin
    .from("portal_notifications")
    .insert({
      empfaenger_user_id: input.empfaengerUserId,
      typ: input.typ,
      titel,
      body,
      vorgang_ref: input.vorgangRef ?? null,
      link: input.link ?? null,
      gelesen: false,
      icon_bg: visual.iconBg,
      icon_fg: visual.iconFg,
      icon_glyph: visual.glyph,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}
