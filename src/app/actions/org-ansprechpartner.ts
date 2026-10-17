"use server";

import { logDbError } from "@/lib/errors/log-db-error";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Ansprechpartner der Hausverwaltung — dieselbe Tabelle `kunden_ansprechpartner` wie im CRM
 * (Karte „Ansprechpartner“ beim Kunden). Gleiche Regeln: Name Pflicht, genau ein Primärer,
 * Legacy-Feld `kunden.ansprechpartner` = Name des Primären.
 */
export type OrgAnsprechpartner = {
  id: string;
  name: string;
  rolle: string | null;
  email: string | null;
  telefon: string | null;
  ist_primaer: boolean;
};

type Fail = { ok: false; error: string };

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function syncLegacyFeld(kundeId: string): Promise<void> {
  const { data: primary } = await supabaseAdmin
    .from("kunden_ansprechpartner")
    .select("name")
    .eq("kunde_id", kundeId)
    .eq("ist_primaer", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  const name = String(primary?.name ?? "").trim() || null;
  const { error } = await supabaseAdmin
    .from("kunden")
    .update({ ansprechpartner: name, updated_at: new Date().toISOString() })
    .eq("id", kundeId);
  if (error) logDbError("app/actions/org-ansprechpartner:sync", error);
}

export async function listOrgAnsprechpartner(): Promise<{ ok: true; liste: OrgAnsprechpartner[] } | Fail> {
  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };
  const { data, error } = await supabaseAdmin
    .from("kunden_ansprechpartner")
    .select("id, name, rolle, email, telefon, ist_primaer")
    .eq("kunde_id", session.kunde.id)
    .order("ist_primaer", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    logDbError("app/actions/org-ansprechpartner:list", error);
    return { ok: false, error: "Ansprechpartner konnten nicht geladen werden." };
  }
  return {
    ok: true,
    liste: (data ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      rolle: r.rolle ?? null,
      email: r.email ?? null,
      telefon: r.telefon ?? null,
      ist_primaer: Boolean(r.ist_primaer),
    })),
  };
}

export async function speichereOrgAnsprechpartner(input: {
  id: string | null;
  name: string;
  rolle: string;
  email: string;
  telefon: string;
  ist_primaer: boolean;
}): Promise<{ ok: true } | Fail> {
  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };
  const write = requireOrgWrite(session);
  if (!write.ok) return { ok: false, error: write.error };

  const kundeId = session.kunde.id;
  const name = normalizeName(input.name);
  if (!name) return { ok: false, error: "Name ist Pflicht." };
  const email = input.email.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Bitte eine gültige E-Mail eingeben." };
  }
  const telefon = input.telefon.trim() || null;
  const rolle = input.rolle.trim() || null;
  const istPrimaer = Boolean(input.ist_primaer);

  if (istPrimaer) {
    await supabaseAdmin.from("kunden_ansprechpartner").update({ ist_primaer: false }).eq("kunde_id", kundeId);
  }

  if (input.id) {
    const patch: Record<string, unknown> = {
      name,
      email,
      telefon,
      rolle,
      ist_primaer: istPrimaer,
      updated_at: new Date().toISOString(),
    };
    if (istPrimaer) patch.sort_order = 0;
    const { error } = await supabaseAdmin
      .from("kunden_ansprechpartner")
      .update(patch)
      .eq("id", input.id)
      .eq("kunde_id", kundeId);
    if (error) {
      logDbError("app/actions/org-ansprechpartner:update", error);
      return { ok: false, error: "Speichern fehlgeschlagen." };
    }
  } else {
    const { error } = await supabaseAdmin.from("kunden_ansprechpartner").insert({
      kunde_id: kundeId,
      name,
      email,
      telefon,
      rolle,
      ist_primaer: istPrimaer,
      sort_order: istPrimaer ? 0 : 100,
    });
    if (error) {
      logDbError("app/actions/org-ansprechpartner:insert", error);
      return { ok: false, error: "Speichern fehlgeschlagen." };
    }
  }
  await syncLegacyFeld(kundeId);
  return { ok: true };
}

export async function entferneOrgAnsprechpartner(id: string): Promise<{ ok: true } | Fail> {
  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };
  const write = requireOrgWrite(session);
  if (!write.ok) return { ok: false, error: write.error };
  const { error } = await supabaseAdmin
    .from("kunden_ansprechpartner")
    .delete()
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);
  if (error) {
    logDbError("app/actions/org-ansprechpartner:delete", error);
    return { ok: false, error: "Entfernen fehlgeschlagen." };
  }
  await syncLegacyFeld(session.kunde.id);
  return { ok: true };
}
