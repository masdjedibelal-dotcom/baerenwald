/**
 * Org-Hausmeister: Personenstamm + Objekt-Zuordnung (1:1 Objekt→HM).
 */

import {
  buildPortalEinladungUrl,
  createPortalEinladungToken,
  portalEinladungExpiresAt,
} from "@/lib/portal2/portal-einladungen";
import { supabaseAdmin } from "@/lib/supabase";

export type OrgHausmeister = {
  id: string;
  org_kunde_id: string;
  name: string;
  email: string | null;
  portal_zugang: boolean;
  portal_kunde_id: string | null;
};

export type HausmeisterAmObjekt = OrgHausmeister & {
  kunde_objekt_id: string;
};

export async function listOrgHausmeister(
  orgKundeId: string
): Promise<OrgHausmeister[]> {
  const { data, error } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id, org_kunde_id, name, email, portal_zugang, portal_kunde_id")
    .eq("org_kunde_id", orgKundeId)
    .order("name", { ascending: true });
  if (error) {
    console.warn("[org-hausmeister] list:", error.message);
    return [];
  }
  return (data ?? []).map(mapHm);
}

function mapHm(row: Record<string, unknown>): OrgHausmeister {
  return {
    id: String(row.id),
    org_kunde_id: String(row.org_kunde_id),
    name: String(row.name ?? "").trim() || "Hausmeister",
    email: row.email != null ? String(row.email).trim() || null : null,
    portal_zugang: Boolean(row.portal_zugang),
    portal_kunde_id:
      row.portal_kunde_id != null ? String(row.portal_kunde_id) : null,
  };
}

export async function loadHausmeisterForObjekt(
  kundeObjektId: string | null | undefined
): Promise<HausmeisterAmObjekt | null> {
  const oid = String(kundeObjektId ?? "").trim();
  if (!oid) return null;

  const { data, error } = await supabaseAdmin
    .from("hausmeister_objekte")
    .select(
      "kunde_objekt_id, org_hausmeister:org_hausmeister_id(id, org_kunde_id, name, email, portal_zugang, portal_kunde_id)"
    )
    .eq("kunde_objekt_id", oid)
    .maybeSingle();

  if (error) {
    // Fallback: altes objekt_kontakte
    return loadLegacyKontaktAsHm(oid);
  }
  const joined = data?.org_hausmeister as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null
    | undefined;
  const hmRaw = Array.isArray(joined) ? joined[0] ?? null : joined ?? null;
  if (!hmRaw?.id) return loadLegacyKontaktAsHm(oid);
  return {
    ...mapHm(hmRaw),
    kunde_objekt_id: oid,
  };
}

async function loadLegacyKontaktAsHm(
  oid: string
): Promise<HausmeisterAmObjekt | null> {
  const { data } = await supabaseAdmin
    .from("objekt_kontakte")
    .select("id, name, email, telefon, kunde_id")
    .eq("kunde_objekt_id", oid)
    .eq("rolle", "hausmeister")
    .eq("aktiv", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) return null;
  return {
    id: String(data.id),
    org_kunde_id: String((data as { kunde_id?: string }).kunde_id ?? ""),
    name: String(data.name ?? "").trim() || "Hausmeister",
    email: data.email != null ? String(data.email).trim() || null : null,
    portal_zugang: false,
    portal_kunde_id: null,
    kunde_objekt_id: oid,
  };
}

export async function upsertOrgHausmeister(input: {
  orgKundeId: string;
  id?: string | null;
  name: string;
  email?: string | null;
  portalZugang: boolean;
}): Promise<{ ok: true; hm: OrgHausmeister } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name des Hausmeisters fehlt." };
  const email = input.email?.trim().toLowerCase() || null;
  if (input.portalZugang && !email) {
    return { ok: false, error: "E-Mail ist für Portal-Zugang erforderlich." };
  }

  if (input.id?.trim()) {
    const { data, error } = await supabaseAdmin
      .from("org_hausmeister")
      .update({
        name,
        email,
        portal_zugang: input.portalZugang,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id.trim())
      .eq("org_kunde_id", input.orgKundeId)
      .select("id, org_kunde_id, name, email, portal_zugang, portal_kunde_id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Speichern fehlgeschlagen." };
    }
    return { ok: true, hm: mapHm(data as Record<string, unknown>) };
  }

  const { data, error } = await supabaseAdmin
    .from("org_hausmeister")
    .insert({
      org_kunde_id: input.orgKundeId,
      name,
      email,
      portal_zugang: input.portalZugang,
    })
    .select("id, org_kunde_id, name, email, portal_zugang, portal_kunde_id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Anlegen fehlgeschlagen." };
  }
  return { ok: true, hm: mapHm(data as Record<string, unknown>) };
}

/** Objekt einem HM zuordnen (ersetzt bisherigen). */
export async function assignHausmeisterToObjekt(input: {
  orgKundeId: string;
  objektId: string;
  orgHausmeisterId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: hm } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id")
    .eq("id", input.orgHausmeisterId)
    .eq("org_kunde_id", input.orgKundeId)
    .maybeSingle();
  if (!hm?.id) return { ok: false, error: "Hausmeister nicht gefunden." };

  const { error: delErr } = await supabaseAdmin
    .from("hausmeister_objekte")
    .delete()
    .eq("kunde_objekt_id", input.objektId);
  if (delErr && !/does not exist|relation/i.test(delErr.message)) {
    return { ok: false, error: delErr.message };
  }

  const { error } = await supabaseAdmin.from("hausmeister_objekte").insert({
    org_hausmeister_id: input.orgHausmeisterId,
    kunde_objekt_id: input.objektId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Zuordnung Objekt↔HM entfernen (Person bleibt in der Org). */
export async function unassignHausmeisterFromObjekt(input: {
  orgKundeId: string;
  objektId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: obj } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", input.objektId)
    .eq("kunde_id", input.orgKundeId)
    .maybeSingle();
  if (!obj?.id) return { ok: false, error: "Objekt nicht gefunden." };

  const { error } = await supabaseAdmin
    .from("hausmeister_objekte")
    .delete()
    .eq("kunde_objekt_id", input.objektId);
  if (error && !/does not exist|relation/i.test(error.message)) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function createHausmeisterEinladung(input: {
  orgKundeId: string;
  orgHausmeisterId: string;
  objektId: string;
  createdBy?: string | null;
}): Promise<
  | { ok: true; url: string; token: string }
  | { ok: false; error: string }
> {
  const { data: hm } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id, email, portal_zugang, name")
    .eq("id", input.orgHausmeisterId)
    .eq("org_kunde_id", input.orgKundeId)
    .maybeSingle();
  if (!hm?.id) return { ok: false, error: "Hausmeister nicht gefunden." };
  const email = String(hm.email ?? "").trim();
  if (!email) {
    return { ok: false, error: "E-Mail fehlt — bitte zuerst hinterlegen." };
  }
  if (!hm.portal_zugang) {
    await supabaseAdmin
      .from("org_hausmeister")
      .update({
        portal_zugang: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", hm.id)
      .eq("org_kunde_id", input.orgKundeId);
  }

  const token = createPortalEinladungToken();
  const expires_at = portalEinladungExpiresAt().toISOString();
  const { data, error } = await supabaseAdmin
    .from("portal_einladungen")
    .insert({
      token,
      kunde_id: input.orgKundeId,
      objekt_id: input.objektId,
      org_hausmeister_id: input.orgHausmeisterId,
      status: "offen",
      expires_at,
      created_by: input.createdBy ?? null,
    })
    .select("token")
    .single();

  if (error) {
    const missing = /org_hausmeister_id|does not exist|relation/i.test(
      error.message
    );
    return {
      ok: false,
      error: missing
        ? "Hausmeister-Einladungen noch nicht freigeschaltet (Migration)."
        : error.message,
    };
  }
  const t = String(data?.token ?? token);
  return { ok: true, url: buildPortalEinladungUrl(t), token: t };
}

export function buildHausmeisterEinladungMailto(opts: {
  toEmail: string;
  link: string;
  hvName: string;
  objektLabel: string;
  hmName: string;
}): string {
  const subj = encodeURIComponent(
    `Portal-Zugang Hausmeister — ${opts.objektLabel}`
  );
  const body = encodeURIComponent(
    [
      `Guten Tag ${opts.hmName},`,
      "",
      `hiermit laden wir Sie ein, Ihr Hausmeister-Konto für ${opts.objektLabel} anzulegen.`,
      "",
      "Im Portal sehen Sie die Vorgänge Ihrer Objekte und können Hausmeister-Prüfungen (Checklisten) durchführen.",
      "",
      "Bitte nutzen Sie diesen persönlichen Link:",
      opts.link,
      "",
      "Viele Grüße",
      opts.hvName,
    ].join("\n")
  );
  return `mailto:${encodeURIComponent(opts.toEmail.trim())}?subject=${subj}&body=${body}`;
}

/** Objekt-IDs für einen Portal-Hausmeister-Kunden. */
export async function listObjektIdsForHausmeisterPortalKunde(
  portalKundeId: string
): Promise<string[]> {
  const { data: hmRows } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id")
    .eq("portal_kunde_id", portalKundeId);
  const hmIds = (hmRows ?? []).map((r) => String(r.id));
  if (!hmIds.length) return [];
  const { data: zuord } = await supabaseAdmin
    .from("hausmeister_objekte")
    .select("kunde_objekt_id")
    .in("org_hausmeister_id", hmIds);
  return (zuord ?? [])
    .map((r) => String(r.kunde_objekt_id ?? "").trim())
    .filter(Boolean);
}
