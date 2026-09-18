/**
 * Hausmeister-Portal aktivieren (Stub + optional Auth).
 * Ausnahme info@baerenwald-muenchen.de: gleiches Login wie CRM/Partner.
 */
import { isBaerenwaldPrimaryStaffEmail } from "@/lib/auth/baerenwald-primary-staff";
import { supabaseAdmin } from "@/lib/supabase";

export { isBaerenwaldPrimaryStaffEmail };

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("auth_user_id")
    .ilike("email", e)
    .not("auth_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (hw?.auth_user_id) return String(hw.auth_user_id);

  const { data: k } = await supabaseAdmin
    .from("kunden")
    .select("auth_user_id")
    .ilike("email", e)
    .not("auth_user_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (k?.auth_user_id) return String(k.auth_user_id);

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .ilike("email", e)
    .limit(1)
    .maybeSingle();
  if (profile?.id) return String(profile.id);

  return null;
}

export async function ensureHausmeisterPortalActivation(opts: {
  orgHausmeisterId: string;
  orgKundeId: string;
}): Promise<
  | {
      ok: true;
      portalKundeId: string;
      hasAuthAccount: boolean;
      primaryStaff: boolean;
    }
  | { ok: false; error: string }
> {
  const hmId = opts.orgHausmeisterId.trim();
  const orgId = opts.orgKundeId.trim();
  if (!hmId || !orgId) return { ok: false, error: "Hausmeister/Org fehlt." };

  const { data: hm, error: hmErr } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id, name, email, portal_zugang, portal_kunde_id")
    .eq("id", hmId)
    .eq("org_kunde_id", orgId)
    .maybeSingle();
  if (hmErr || !hm?.id) {
    return { ok: false, error: hmErr?.message ?? "Hausmeister nicht gefunden." };
  }

  const email = String(hm.email ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "E-Mail fehlt für Portal-Zugang." };
  if (!hm.portal_zugang) {
    return { ok: false, error: "Portal-Zugang ist nicht aktiviert." };
  }

  const primaryStaff = isBaerenwaldPrimaryStaffEmail(email);
  const name = String(hm.name ?? "").trim() || "Hausmeister";

  let portalKundeId = hm.portal_kunde_id ? String(hm.portal_kunde_id) : "";

  if (!portalKundeId) {
    const { data: existingHmKunde } = await supabaseAdmin
      .from("kunden")
      .select("id, auth_user_id, portal_modus")
      .ilike("email", email)
      .eq("portal_modus", "hausmeister")
      .limit(1)
      .maybeSingle();

    if (existingHmKunde?.id) {
      portalKundeId = String(existingHmKunde.id);
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("kunden")
        .insert({
          name,
          email,
          typ: "privat",
          portal_modus: "hausmeister",
        })
        .select("id")
        .single();
      if (createErr || !created?.id) {
        return {
          ok: false,
          error:
            createErr?.message ?? "Portal-Konto konnte nicht angelegt werden.",
        };
      }
      portalKundeId = String(created.id);
    }
  }

  let hasAuthAccount = false;
  const authUserId = await findAuthUserIdByEmail(email);

  if (authUserId) {
    const { data: occupied } = await supabaseAdmin
      .from("kunden")
      .select("id, portal_modus")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (!occupied?.id) {
      const { error: linkErr } = await supabaseAdmin
        .from("kunden")
        .update({
          auth_user_id: authUserId,
          email,
          name,
          portal_modus: "hausmeister",
          updated_at: new Date().toISOString(),
        })
        .eq("id", portalKundeId);
      if (linkErr) {
        console.warn("[ensureHausmeisterPortal] auth link:", linkErr.message);
      } else {
        hasAuthAccount = true;
      }
    } else if (String(occupied.id) === portalKundeId) {
      hasAuthAccount = true;
    } else if (primaryStaff) {
      hasAuthAccount = true;
    }
  } else if (!primaryStaff) {
    const { data: stub } = await supabaseAdmin
      .from("kunden")
      .select("auth_user_id")
      .eq("id", portalKundeId)
      .maybeSingle();
    hasAuthAccount = Boolean(stub?.auth_user_id);
  }

  const { error: upHmErr } = await supabaseAdmin
    .from("org_hausmeister")
    .update({
      portal_kunde_id: portalKundeId,
      portal_zugang: true,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hmId)
    .eq("org_kunde_id", orgId);

  if (upHmErr) return { ok: false, error: upHmErr.message };

  return { ok: true, portalKundeId, hasAuthAccount, primaryStaff };
}
