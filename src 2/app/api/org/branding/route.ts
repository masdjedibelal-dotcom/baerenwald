import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { requireOrgAdminSession } from "@/lib/org/require-org-session";
import {
  findBrandPresetByPrimary,
  resolveBrandPalette,
} from "@/lib/portal2/brand-presets";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  org_anzeigename?: string | null;
  org_sub?: string | null;
  org_logo_kuerzel?: string | null;
  org_primary_color?: string | null;
  org_primary_color_dk?: string | null;
  org_primary_color_soft?: string | null;
  org_telefon?: string | null;
  org_strasse?: string | null;
  org_ort?: string | null;
  /** Service-E-Mail für Mieter (= mieter_kontakt_email) */
  mieter_kontakt_email?: string | null;
  /** Telefon für Mieter (= mieter_kontakt_telefon), sync mit org_telefon */
  mieter_kontakt_telefon?: string | null;
};

function trimOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/**
 * D6/D12 Branding-Editor — persistiert White-Label-Felder an `kunden`.
 * Palette-Spalten brauchen A2-Migration; ohne Spalte liefert PostgREST Fehler → klar melden.
 */
export async function PATCH(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.org_anzeigename !== undefined) {
    patch.org_anzeigename = trimOrNull(body.org_anzeigename);
  }
  if (body.org_sub !== undefined) {
    patch.org_sub = trimOrNull(body.org_sub) || "Verwaltung";
  }
  if (body.org_logo_kuerzel !== undefined) {
    const k = trimOrNull(body.org_logo_kuerzel);
    patch.org_logo_kuerzel = k ? k.slice(0, 4).toUpperCase() : null;
  }
  if (body.org_telefon !== undefined) {
    patch.org_telefon = trimOrNull(body.org_telefon);
  }
  if (body.org_strasse !== undefined) {
    patch.org_strasse = trimOrNull(body.org_strasse);
  }
  if (body.org_ort !== undefined) {
    patch.org_ort = trimOrNull(body.org_ort);
  }
  if (body.mieter_kontakt_email !== undefined) {
    patch.mieter_kontakt_email = trimOrNull(body.mieter_kontakt_email);
  }
  if (body.mieter_kontakt_telefon !== undefined) {
    patch.mieter_kontakt_telefon = trimOrNull(body.mieter_kontakt_telefon);
  } else if (body.org_telefon !== undefined) {
    // Profil-Telefon = Mieter-Kommunikation (kein Doppel-Feld nötig)
    patch.mieter_kontakt_telefon = trimOrNull(body.org_telefon);
  }

  if (body.org_primary_color !== undefined) {
    const primary = trimOrNull(body.org_primary_color);
    if (primary) {
      const preset = findBrandPresetByPrimary(primary);
      const palette = resolveBrandPalette({
        primary,
        primaryDk: body.org_primary_color_dk ?? preset?.primaryDk,
        soft: body.org_primary_color_soft ?? preset?.soft,
      });
      patch.org_primary_color = palette.primary;
      patch.org_primary_color_dk = palette.primaryDk;
      patch.org_primary_color_soft = palette.soft;
    } else {
      patch.org_primary_color = null;
      patch.org_primary_color_dk = null;
      patch.org_primary_color_soft = null;
    }
  } else {
    if (body.org_primary_color_dk !== undefined) {
      patch.org_primary_color_dk = trimOrNull(body.org_primary_color_dk);
    }
    if (body.org_primary_color_soft !== undefined) {
      patch.org_primary_color_soft = trimOrNull(body.org_primary_color_soft);
    }
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update(patch)
    .eq("id", session.kunde.id)
    .select(
      "org_anzeigename, org_sub, org_logo_kuerzel, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_telefon, org_strasse, org_ort, mieter_kontakt_email, mieter_kontakt_telefon, org_logo_url"
    )
    .single();

  if (error) {
    const msg = error.message || "Speichern fehlgeschlagen.";
    const migrationHint =
      /org_primary_color_dk|org_sub|org_logo_kuerzel|org_telefon|org_strasse|org_ort/i.test(
        msg
      )
        ? " Branding-Spalten fehlen ggf. — Migration 20260818120000_org_branding_palette.sql anwenden."
        : "";
    return NextResponse.json(
      { error: `${msg}${migrationHint}` },
      { status: 500 }
    );
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.kunde.id,
    aktion: "branding_geaendert",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: patch,
  });

  return NextResponse.json({ ok: true, branding: data });
}
