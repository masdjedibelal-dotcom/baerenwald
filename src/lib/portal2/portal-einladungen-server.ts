/**
 * Server: portal_einladungen laden / einlösen (E4).
 * Tabelle: Migration STOP — bis Apply schlagen Writes fehl.
 */

import {
  buildPortalEinladungUrl,
  createPortalEinladungToken,
  portalEinladungExpiresAt,
  resolvePortalEinladungStatus,
  type PortalEinladungStatus,
} from "@/lib/portal2/portal-einladungen";
import type { MieterWlBrand } from "@/lib/portal2/mieter-wl";
import { resolveOrgSubLabel } from "@/lib/portal2/brand-presets";
import { supabaseAdmin } from "@/lib/supabase";

export type PortalEinladungRow = {
  id: string;
  token: string;
  kunde_id: string;
  objekt_id: string | null;
  einheit_ref: string | null;
  einheit_id: string | null;
  bewohner_id: string | null;
  org_hausmeister_id?: string | null;
  portal_kunde_id: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  eingeloest_am: string | null;
};

export type CreatePortalEinladungInput = {
  kundeId: string;
  objektId: string;
  einheitId?: string | null;
  einheitRef?: string | null;
  bewohnerId?: string | null;
  createdBy?: string | null;
};

export async function createPortalEinladung(
  input: CreatePortalEinladungInput
): Promise<
  | { ok: true; row: PortalEinladungRow; url: string }
  | { ok: false; error: string; code?: string }
> {
  const token = createPortalEinladungToken();
  const expires_at = portalEinladungExpiresAt().toISOString();
  const { data, error } = await supabaseAdmin
    .from("portal_einladungen")
    .insert({
      token,
      kunde_id: input.kundeId,
      objekt_id: input.objektId,
      einheit_id: input.einheitId ?? null,
      einheit_ref: input.einheitRef?.trim() || null,
      bewohner_id: input.bewohnerId ?? null,
      status: "offen",
      expires_at,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    const msg = error.message ?? "Einladung fehlgeschlagen";
    const missing =
      /portal_einladungen|does not exist|relation/i.test(msg) ||
      error.code === "42P01";
    return {
      ok: false,
      error: missing
        ? "Einladungs-Tabelle noch nicht freigegeben (Migration STOP)."
        : msg,
      code: missing ? "migration_stop" : undefined,
    };
  }

  const row = data as PortalEinladungRow;
  return { ok: true, row, url: buildPortalEinladungUrl(row.token) };
}

export type ResolvedPortalEinladung = {
  row: PortalEinladungRow;
  status: PortalEinladungStatus;
  brand: MieterWlBrand;
  objektTitel: string;
  einheitLabel: string | null;
  orgKennung: string | null;
  /** Mieter, Eigentümer oder Hausmeister — steuert Auth-Copy & portal_modus. */
  rolle: "mieter" | "eigentuemer" | "hausmeister";
  /** Stammdaten vom Bewohner (Prefill, locked). */
  prefill: {
    name: string | null;
    email: string | null;
    telefon: string | null;
  };
};

export async function resolvePortalEinladungByToken(
  token: string
): Promise<
  | { ok: true; data: ResolvedPortalEinladung }
  | { ok: false; error: string; status: number }
> {
  const t = token.trim();
  if (!t) return { ok: false, error: "Token fehlt.", status: 400 };

  const { data, error } = await supabaseAdmin
    .from("portal_einladungen")
    .select("*")
    .eq("token", t)
    .maybeSingle();

  if (error) {
    const missing = /portal_einladungen|does not exist|relation/i.test(
      error.message ?? ""
    );
    return {
      ok: false,
      error: missing
        ? "Einladungen sind noch nicht freigeschaltet."
        : error.message,
      status: missing ? 503 : 500,
    };
  }
  if (!data) return { ok: false, error: "Einladung nicht gefunden.", status: 404 };

  const row = data as PortalEinladungRow;
  const status = resolvePortalEinladungStatus(row);
  if (status === "abgelaufen" && row.status === "offen") {
    await supabaseAdmin
      .from("portal_einladungen")
      .update({ status: "abgelaufen" })
      .eq("id", row.id);
  }

  const { data: org } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, org_kennung, org_anzeigename, org_sub, org_logo_url, org_logo_kuerzel, org_primary_color, org_primary_color_dk, org_primary_color_soft, mieter_kontakt_telefon, mieter_kontakt_email, org_telefon"
    )
    .eq("id", row.kunde_id)
    .maybeSingle();

  if (!org) return { ok: false, error: "Organisation nicht gefunden.", status: 404 };

  let objektTitel = "Objekt";
  if (row.objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", row.objekt_id)
      .maybeSingle();
    if (obj?.titel) objektTitel = String(obj.titel);
  }

  let einheitLabel = row.einheit_ref?.trim() || null;
  if (row.einheit_id && !einheitLabel) {
    const { data: u } = await supabaseAdmin
      .from("objekt_einheiten")
      .select("bezeichnung")
      .eq("id", row.einheit_id)
      .maybeSingle();
    einheitLabel = u?.bezeichnung?.trim() || null;
  }

  let rolle: "mieter" | "eigentuemer" | "hausmeister" = "mieter";
  const prefill = {
    name: null as string | null,
    email: null as string | null,
    telefon: null as string | null,
  };
  const orgHmId = String(row.org_hausmeister_id ?? "").trim();
  if (orgHmId) {
    rolle = "hausmeister";
    const { data: hm } = await supabaseAdmin
      .from("org_hausmeister")
      .select("name, email")
      .eq("id", orgHmId)
      .maybeSingle();
    if (hm) {
      prefill.name = String(hm.name ?? "").trim() || null;
      prefill.email = String(hm.email ?? "").trim().toLowerCase() || null;
    }
  } else if (row.bewohner_id) {
    const { data: bew } = await supabaseAdmin
      .from("einheit_bewohner")
      .select("name, email, telefon, rolle")
      .eq("id", row.bewohner_id)
      .maybeSingle();
    if (bew) {
      if (String(bew.rolle ?? "") === "eigentuemer") {
        rolle = "eigentuemer";
      }
      prefill.name = String(bew.name ?? "").trim() || null;
      prefill.email = String(bew.email ?? "").trim().toLowerCase() || null;
      prefill.telefon = String(bew.telefon ?? "").trim() || null;
    }
  }

  const brand: MieterWlBrand = {
    name:
      (org as { org_anzeigename?: string }).org_anzeigename?.trim() ||
      org.name?.trim() ||
      "Verwaltung",
    sub: resolveOrgSubLabel((org as { org_sub?: string | null }).org_sub),
    logoUrl: (org as { org_logo_url?: string | null }).org_logo_url,
    logoKuerzel: (org as { org_logo_kuerzel?: string | null }).org_logo_kuerzel,
    primary: (org as { org_primary_color?: string | null }).org_primary_color,
    primaryDk: (org as { org_primary_color_dk?: string | null })
      .org_primary_color_dk,
    soft: (org as { org_primary_color_soft?: string | null })
      .org_primary_color_soft,
    tel:
      (org as { mieter_kontakt_telefon?: string | null })
        .mieter_kontakt_telefon ||
      (org as { org_telefon?: string | null }).org_telefon ||
      null,
    mail:
      (org as { mieter_kontakt_email?: string | null }).mieter_kontakt_email ||
      null,
  };

  return {
    ok: true,
    data: {
      row: { ...row, status },
      status,
      brand,
      objektTitel,
      einheitLabel,
      orgKennung: (org as { org_kennung?: string | null }).org_kennung ?? null,
      rolle,
      prefill,
    },
  };
}

/**
 * Nach Auth-Signup: Mieter↔Einheit zuordnen, Einladung einlösen.
 * Landing: /portal (D10 Mieter-Konto).
 */
export async function redeemPortalEinladung(opts: {
  token: string;
  authUserId: string;
  email: string;
  name?: string | null;
  telefon?: string | null;
}): Promise<
  | { ok: true; portalKundeId: string }
  | { ok: false; error: string; status: number }
> {
  const resolved = await resolvePortalEinladungByToken(opts.token);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, status: resolved.status };
  }
  const { row, status } = resolved.data;
  if (status !== "offen") {
    return {
      ok: false,
      error:
        status === "eingeloest"
          ? "Diese Einladung wurde bereits eingelöst."
          : "Diese Einladung ist nicht mehr gültig.",
      status: 410,
    };
  }

  const email = opts.email.trim().toLowerCase();
  const name = opts.name?.trim() || email.split("@")[0] || "Nutzer";

  const orgHmId = String(
    (row as { org_hausmeister_id?: string | null }).org_hausmeister_id ?? ""
  ).trim();

  let inviteRolle: "mieter" | "eigentuemer" | "hausmeister" = "mieter";
  if (orgHmId) {
    inviteRolle = "hausmeister";
  } else if (row.bewohner_id) {
    const { data: bew } = await supabaseAdmin
      .from("einheit_bewohner")
      .select("rolle")
      .eq("id", row.bewohner_id)
      .maybeSingle();
    if (String(bew?.rolle ?? "") === "eigentuemer") {
      inviteRolle = "eigentuemer";
    }
  }

  // Primary-Staff (info@baerenwald-muenchen.de): kein zweites Auth-Konto —
  // HM-Stub aktivieren und Einladung einlösen.
  if (inviteRolle === "hausmeister" && orgHmId) {
    const { isBaerenwaldPrimaryStaffEmail, ensureHausmeisterPortalActivation } =
      await import("@/lib/org/ensure-hausmeister-portal");
    if (isBaerenwaldPrimaryStaffEmail(email)) {
      await supabaseAdmin
        .from("org_hausmeister")
        .update({
          portal_zugang: true,
          email,
          name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgHmId)
        .eq("org_kunde_id", row.kunde_id);
      const act = await ensureHausmeisterPortalActivation({
        orgHausmeisterId: orgHmId,
        orgKundeId: String(row.kunde_id),
      });
      if (!act.ok) {
        return { ok: false, error: act.error, status: 500 };
      }
      if (row.objekt_id) {
        await supabaseAdmin.from("hausmeister_objekte").upsert(
          {
            org_hausmeister_id: orgHmId,
            kunde_objekt_id: row.objekt_id,
          },
          { onConflict: "kunde_objekt_id" }
        );
      }
      const { error: updErr } = await supabaseAdmin
        .from("portal_einladungen")
        .update({
          status: "eingeloest",
          eingeloest_am: new Date().toISOString(),
          portal_kunde_id: act.portalKundeId,
        })
        .eq("id", row.id)
        .eq("status", "offen");
      if (updErr) {
        return { ok: false, error: updErr.message, status: 500 };
      }
      return { ok: true, portalKundeId: act.portalKundeId };
    }
  }

  const portalModus =
    inviteRolle === "eigentuemer"
      ? "eigentuemer"
      : inviteRolle === "hausmeister"
        ? "hausmeister"
        : inviteRolle === "mieter"
          ? "mieter"
          : "privat";

  // Bestehenden Kundenstamm zur E-Mail nutzen oder anlegen (kein Org-Stamm).
  let portalKundeId: string | null = null;
  {
    const { data: existing } = await supabaseAdmin
      .from("kunden")
      .select("id, portal_modus, auth_user_id")
      .ilike("email", email)
      .limit(5);

    const candidates = (existing ?? []).filter((k) => {
      const m = (k.portal_modus ?? "") as string;
      if (m === "organisation") return false;
      if (inviteRolle === "hausmeister") {
        return m === "hausmeister" || !m || m === "privat";
      }
      return true;
    });
    // HM: Stub mit portal_modus=hausmeister bevorzugen
    const hmStub = candidates.find((k) => (k.portal_modus ?? "") === "hausmeister");
    const linked = candidates.find((k) => k.auth_user_id === opts.authUserId);
    const free = candidates.find((k) => !k.auth_user_id);
    const pick =
      inviteRolle === "hausmeister"
        ? hmStub ?? linked ?? free ?? candidates[0]
        : linked ?? free ?? candidates[0];

    if (pick) {
      portalKundeId = String(pick.id);
      const { data: authOccupied } = await supabaseAdmin
        .from("kunden")
        .select("id")
        .eq("auth_user_id", opts.authUserId)
        .maybeSingle();
      const canTakeAuth =
        !authOccupied?.id || String(authOccupied.id) === portalKundeId;
      await supabaseAdmin
        .from("kunden")
        .update({
          ...(canTakeAuth ? { auth_user_id: opts.authUserId } : {}),
          name,
          email,
          portal_modus: portalModus,
        })
        .eq("id", portalKundeId);
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("kunden")
        .insert({
          name,
          email,
          auth_user_id: opts.authUserId,
          portal_modus: portalModus,
          typ: "privat",
        })
        .select("id")
        .single();
      if (createErr || !created) {
        return {
          ok: false,
          error: createErr?.message ?? "Konto konnte nicht angelegt werden.",
          status: 500,
        };
      }
      portalKundeId = String(created.id);
    }
  }

  if (inviteRolle === "hausmeister" && orgHmId && portalKundeId) {
    await supabaseAdmin
      .from("org_hausmeister")
      .update({
        portal_kunde_id: portalKundeId,
        portal_zugang: true,
        name,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgHmId)
      .eq("org_kunde_id", row.kunde_id);
    if (row.objekt_id) {
      await supabaseAdmin.from("hausmeister_objekte").upsert(
        {
          org_hausmeister_id: orgHmId,
          kunde_objekt_id: row.objekt_id,
        },
        { onConflict: "kunde_objekt_id" }
      );
    }
  }

  // Bewohner zuordnen / anlegen
  if (inviteRolle !== "hausmeister" && row.einheit_id) {
    if (row.bewohner_id) {
      await supabaseAdmin
        .from("einheit_bewohner")
        .update({
          email,
          name,
          telefon: opts.telefon?.trim() || null,
          aktiv: true,
          portal_kunde_id: portalKundeId,
        })
        .eq("id", row.bewohner_id)
        .eq("kunde_id", row.kunde_id);
    } else {
      const { data: existingB } = await supabaseAdmin
        .from("einheit_bewohner")
        .select("id")
        .eq("objekt_einheit_id", row.einheit_id)
        .eq("kunde_id", row.kunde_id)
        .eq("aktiv", true)
        .ilike("email", email)
        .maybeSingle();

      if (!existingB) {
        await supabaseAdmin.from("einheit_bewohner").insert({
          kunde_id: row.kunde_id,
          objekt_einheit_id: row.einheit_id,
          name,
          email,
          telefon: opts.telefon?.trim() || null,
          aktiv: true,
          rolle: inviteRolle,
          portal_kunde_id: portalKundeId,
        });
      } else {
        await supabaseAdmin
          .from("einheit_bewohner")
          .update({ portal_kunde_id: portalKundeId })
          .eq("id", existingB.id);
      }
    }

    // Gleiche Person (E-Mail) auf anderen Einheiten → gleiches Portal-Konto
    if (inviteRolle === "eigentuemer" && portalKundeId && email) {
      await supabaseAdmin
        .from("einheit_bewohner")
        .update({ portal_kunde_id: portalKundeId })
        .eq("kunde_id", row.kunde_id)
        .eq("rolle", "eigentuemer")
        .eq("aktiv", true)
        .ilike("email", email)
        .is("anonymisiert_am", null);
    }
  }

  // Eigentümer-Sicht: alle zugeordneten Objekte (nicht nur Einladungs-Objekt)
  if (inviteRolle === "eigentuemer" && portalKundeId) {
    const { syncEigentuemerObjekteForPortalKunde } = await import(
      "@/lib/org/org-eigentuemer"
    );
    if (row.objekt_id) {
      const { ensureEigentuemerObjektLink } = await import(
        "@/lib/org/org-eigentuemer"
      );
      await ensureEigentuemerObjektLink({
        portalKundeId,
        objektId: row.objekt_id,
      });
    }
    await syncEigentuemerObjekteForPortalKunde(portalKundeId);
  }

  const { error: updErr } = await supabaseAdmin
    .from("portal_einladungen")
    .update({
      status: "eingeloest",
      eingeloest_am: new Date().toISOString(),
      portal_kunde_id: portalKundeId,
    })
    .eq("id", row.id)
    .eq("status", "offen");

  if (updErr) {
    return { ok: false, error: updErr.message, status: 500 };
  }

  return { ok: true, portalKundeId };
}

/**
 * Offene Hausmeister-Einladungen zur Login-E-Mail einlösen.
 * Deckt: Auth-Konto existiert schon → „Konto aktivieren“ scheitert → Login ohne
 * Einladungslink legt nur privat an und setzt portal_kunde_id nicht.
 */
export async function tryRedeemOpenHausmeisterInvitesForAuthUser(opts: {
  authUserId: string;
  email: string;
  name?: string | null;
  telefon?: string | null;
}): Promise<{ redeemed: boolean; portalKundeId?: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!email || !opts.authUserId) return { redeemed: false };

  const { data: hmRows, error: hmErr } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id")
    .ilike("email", email)
    .eq("portal_zugang", true);

  if (hmErr || !hmRows?.length) return { redeemed: false };

  const hmIds = hmRows.map((r) => String(r.id)).filter(Boolean);
  if (!hmIds.length) return { redeemed: false };

  const { data: invites, error: invErr } = await supabaseAdmin
    .from("portal_einladungen")
    .select("token, created_at")
    .eq("status", "offen")
    .in("org_hausmeister_id", hmIds)
    .order("created_at", { ascending: false });

  if (invErr || !invites?.length) return { redeemed: false };

  for (const inv of invites) {
    const token = String(inv.token ?? "").trim();
    if (!token) continue;
    const result = await redeemPortalEinladung({
      token,
      authUserId: opts.authUserId,
      email,
      name: opts.name,
      telefon: opts.telefon,
    });
    if (result.ok) {
      return { redeemed: true, portalKundeId: result.portalKundeId };
    }
  }

  return { redeemed: false };
}

/**
 * Offene Bewohner-Einladungen (Mieter/Eigentümer) zur Login-E-Mail einlösen.
 * Verhindert „Login ohne Link → Privatkunde in CRM-Liste“.
 */
export async function tryRedeemOpenBewohnerInvitesForAuthUser(opts: {
  authUserId: string;
  email: string;
  name?: string | null;
  telefon?: string | null;
}): Promise<{ redeemed: boolean; portalKundeId?: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!email || !opts.authUserId) return { redeemed: false };

  const { data: bewohner, error: bewErr } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("id")
    .ilike("email", email)
    .eq("aktiv", true)
    .is("anonymisiert_am", null)
    .limit(40);

  if (bewErr || !bewohner?.length) return { redeemed: false };

  const bewIds = bewohner.map((r) => String(r.id)).filter(Boolean);
  if (!bewIds.length) return { redeemed: false };

  const { data: invites, error: invErr } = await supabaseAdmin
    .from("portal_einladungen")
    .select("token, created_at")
    .eq("status", "offen")
    .in("bewohner_id", bewIds)
    .order("created_at", { ascending: false });

  if (invErr || !invites?.length) return { redeemed: false };

  for (const inv of invites) {
    const token = String(inv.token ?? "").trim();
    if (!token) continue;
    const result = await redeemPortalEinladung({
      token,
      authUserId: opts.authUserId,
      email,
      name: opts.name,
      telefon: opts.telefon,
    });
    if (result.ok) {
      return { redeemed: true, portalKundeId: result.portalKundeId };
    }
  }

  return { redeemed: false };
}
