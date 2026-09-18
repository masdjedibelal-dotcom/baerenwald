import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { ensureOrgKennung } from "@/lib/org/ensure-org-kennung";
import {
  normalizeOrgHttpUrl,
  orgMeldeLegalUrlsReady,
} from "@/lib/org/melde-legal-urls";
import { requireOrgAdminSession } from "@/lib/org/require-org-session";
import {
  findBrandPresetByPrimary,
  resolveBrandPalette,
  resolveOrgSubLabel,
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
  org_hausnummer?: string | null;
  org_plz?: string | null;
  org_ort?: string | null;
  /** Service-E-Mail für Mieter (= mieter_kontakt_email) */
  mieter_kontakt_email?: string | null;
  /** Telefon für Mieter (= mieter_kontakt_telefon), sync mit org_telefon */
  mieter_kontakt_telefon?: string | null;
  /** Optionale eigene Legal-URLs für Mieter-Funnel (leer = org Melde-Routen) */
  impressum_url?: string | null;
  datenschutz_url?: string | null;
};

function normalizeHttpUrlOrNull(v: unknown): string | null | "invalid" {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = normalizeOrgHttpUrl(s);
  return n ?? "invalid";
}

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
    patch.org_sub = resolveOrgSubLabel(trimOrNull(body.org_sub));
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
    patch.strasse = trimOrNull(body.org_strasse);
  }
  if (body.org_hausnummer !== undefined) {
    patch.org_hausnummer = trimOrNull(body.org_hausnummer);
    patch.hausnummer = trimOrNull(body.org_hausnummer);
  }
  if (body.org_plz !== undefined) {
    patch.org_plz = trimOrNull(body.org_plz);
    patch.plz = trimOrNull(body.org_plz);
  }
  if (body.org_ort !== undefined) {
    patch.org_ort = trimOrNull(body.org_ort);
    patch.ort = trimOrNull(body.org_ort);
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

  if (body.impressum_url !== undefined) {
    const u = normalizeHttpUrlOrNull(body.impressum_url);
    if (u === "invalid") {
      return NextResponse.json(
        { error: "Impressum-URL ungültig (z. B. www.firma.de/impressum)." },
        { status: 400 }
      );
    }
    patch.impressum_url = u;
  }
  if (body.datenschutz_url !== undefined) {
    const u = normalizeHttpUrlOrNull(body.datenschutz_url);
    if (u === "invalid") {
      return NextResponse.json(
        { error: "Datenschutz-URL ungültig (z. B. www.firma.de/datenschutz)." },
        { status: 400 }
      );
    }
    patch.datenschutz_url = u;
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
      "org_anzeigename, org_sub, org_logo_kuerzel, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, mieter_kontakt_email, mieter_kontakt_telefon, org_logo_url, impressum_url, datenschutz_url, org_kennung"
    )
    .single();

  if (error) {
    const msg = error.message || "Speichern fehlgeschlagen.";
    const missingSplit =
      /org_hausnummer|org_plz/i.test(msg) &&
      (patch.org_hausnummer !== undefined || patch.org_plz !== undefined);

    if (missingSplit) {
      const fallback = { ...patch };
      delete fallback.org_hausnummer;
      delete fallback.org_plz;
      // Legacy: Straße+Nr / PLZ+Ort kombiniert in org_*
      if (body.org_strasse !== undefined || body.org_hausnummer !== undefined) {
        fallback.org_strasse = [trimOrNull(body.org_strasse), trimOrNull(body.org_hausnummer)]
          .filter(Boolean)
          .join(" ") || null;
      }
      if (body.org_plz !== undefined || body.org_ort !== undefined) {
        fallback.org_ort = [trimOrNull(body.org_plz), trimOrNull(body.org_ort)]
          .filter(Boolean)
          .join(" ") || null;
      }
      const retry = await supabaseAdmin
        .from("kunden")
        .update(fallback)
        .eq("id", session.kunde.id)
        .select(
          "org_anzeigename, org_sub, org_logo_kuerzel, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_telefon, org_strasse, org_ort, mieter_kontakt_email, mieter_kontakt_telefon, org_logo_url, impressum_url, datenschutz_url"
        )
        .single();
      if (!retry.error) {
        await writeAuditEvent({
          entityType: "kunde",
          entityId: session.kunde.id,
          aktion: "branding_geaendert",
          actorId: session.userId,
          actorRolle: session.rolle,
          kundeId: session.kunde.id,
          payload: fallback,
        });
        let branding = retry.data as Record<string, unknown>;
        if (
          orgMeldeLegalUrlsReady({
            impressum_url:
              (branding.impressum_url as string | null | undefined) ??
              session.kunde.impressum_url,
            datenschutz_url:
              (branding.datenschutz_url as string | null | undefined) ??
              session.kunde.datenschutz_url,
          }) &&
          !String(branding.org_kennung ?? "").trim()
        ) {
          const kennung = await ensureOrgKennung({
            id: session.kunde.id,
            org_anzeigename:
              (branding.org_anzeigename as string | null | undefined) ??
              session.kunde.org_anzeigename,
            name: session.kunde.name,
          });
          if (kennung) branding = { ...branding, org_kennung: kennung };
        }
        return NextResponse.json({ ok: true, branding });
      }
    }

    const migrationHint =
      /org_primary_color_dk|org_sub|org_logo_kuerzel|org_telefon|org_strasse|org_ort|org_hausnummer|org_plz/i.test(
        msg
      )
        ? " Branding-Spalten fehlen ggf. — Migration org_branding_palette / org_address_split anwenden."
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

  let branding = data;
  const legalReadyAfter = orgMeldeLegalUrlsReady({
    impressum_url:
      (data?.impressum_url as string | null | undefined) ??
      session.kunde.impressum_url,
    datenschutz_url:
      (data?.datenschutz_url as string | null | undefined) ??
      session.kunde.datenschutz_url,
  });
  if (legalReadyAfter && !String(data?.org_kennung ?? "").trim()) {
    const kennung = await ensureOrgKennung({
      id: session.kunde.id,
      org_anzeigename:
        (data?.org_anzeigename as string | null | undefined) ??
        session.kunde.org_anzeigename,
      name: session.kunde.name,
    });
    if (kennung) {
      branding = { ...data, org_kennung: kennung };
    }
  }

  return NextResponse.json({ ok: true, branding });
}
