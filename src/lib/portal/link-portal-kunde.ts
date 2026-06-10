import {
  findKundeIdByEmail,
  isKundenEmailUniqueViolation,
  isKundenRowUniqueViolation,
  normalizeKundenEmail,
} from "@/lib/kunden/kunde-email";
import { mapKundenPortalError } from "@/lib/kunden/kunde-portal-errors";
import { supabaseAdmin } from "@/lib/supabase";

function fail(error: string | { code?: string; message?: string }): LinkPortalKundeResult {
  const raw = typeof error === "string" ? error : error.message ?? "";
  if (raw && raw !== mapKundenPortalError(error)) {
    console.error("[linkPortalKunde]", raw);
  }
  return { ok: false, error: mapKundenPortalError(error) };
}

export type LinkPortalKundeResult =
  | { ok: true; kundeId: string }
  | { ok: false; error: string };

type KundeCandidate = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  created_at: string | null;
};

async function countKundePortalDaten(kundeId: string): Promise<number> {
  const [leads, angebote, auftraege] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("kunde_id", kundeId),
    supabaseAdmin
      .from("angebote")
      .select("id", { count: "exact", head: true })
      .eq("kunde_id", kundeId),
    supabaseAdmin
      .from("auftraege")
      .select("id", { count: "exact", head: true })
      .eq("kunde_id", kundeId),
  ]);

  return (leads.count ?? 0) + (angebote.count ?? 0) + (auftraege.count ?? 0);
}

/** Alle Kundenstämme zur Login-E-Mail (nicht Name, nicht Telefon). */
async function findKundenByLoginEmail(
  email: string
): Promise<KundeCandidate[]> {
  const { data, error } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, email, created_at")
    .ilike("email", email);

  if (error) throw new Error(error.message);
  return (data ?? []) as KundeCandidate[];
}

/**
 * Führender Kundenstamm für die Login-E-Mail:
 * der mit den meisten Portal-Daten; bei Gleichstand der ältere CRM-Stamm.
 */
async function pickCanonicalKundeForLoginEmail(
  email: string
): Promise<(KundeCandidate & { datenAnzahl: number }) | null> {
  const rows = await findKundenByLoginEmail(email);
  if (!rows.length) return null;

  const scored = await Promise.all(
    rows.map(async (k) => ({
      ...k,
      datenAnzahl: await countKundePortalDaten(String(k.id)),
    }))
  );

  scored.sort((a, b) => {
    if (b.datenAnzahl !== a.datenAnzahl) return b.datenAnzahl - a.datenAnzahl;
    const ta = new Date(a.created_at ?? 0).getTime();
    const tb = new Date(b.created_at ?? 0).getTime();
    return ta - tb;
  });

  return scored[0] ?? null;
}

async function detachAuthFromKunde(
  kundeId: string,
  userId: string
): Promise<void> {
  await supabaseAdmin
    .from("kunden")
    .update({ auth_user_id: null })
    .eq("id", kundeId)
    .eq("auth_user_id", userId);
}

/**
 * Verknüpft Auth-User mit kunden.auth_user_id.
 * Die Login-E-Mail ist führend — Name dient nur zur Anzeige, nie zur Zuordnung.
 */
export async function linkPortalKundeToAuthUser(opts: {
  userId: string;
  email: string;
  name?: string | null;
  telefon?: string | null;
}): Promise<LinkPortalKundeResult> {
  const email = normalizeKundenEmail(opts.email);
  if (!email) {
    return { ok: false, error: "Keine E-Mail-Adresse im Konto." };
  }

  const { data: linkedByAuth } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, email")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  let canonical: (KundeCandidate & { datenAnzahl: number }) | null = null;
  try {
    canonical = await pickCanonicalKundeForLoginEmail(email);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Kundenabgleich fehlgeschlagen.");
  }

  if (canonical) {
    const foreignAuth = canonical.auth_user_id;
    if (foreignAuth && foreignAuth !== opts.userId) {
      return {
        ok: false,
        error:
          "Diese E-Mail ist bereits mit einem anderen Portal-Konto verknüpft. Bitte wende dich an uns.",
      };
    }

    if (linkedByAuth?.id && linkedByAuth.id !== canonical.id) {
      await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
    }

    const { error: upErr } = await supabaseAdmin
      .from("kunden")
      .update({
        auth_user_id: opts.userId,
        email,
      })
      .eq("id", canonical.id);

    if (upErr) return fail(upErr);
    return { ok: true, kundeId: String(canonical.id) };
  }

  if (linkedByAuth?.id) {
    const linkedEmail = (linkedByAuth.email ?? "").trim().toLowerCase();
    if (linkedEmail === email) {
      return { ok: true, kundeId: String(linkedByAuth.id) };
    }
    await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
  }

  const name =
    opts.name?.trim() ||
    email.split("@")[0]?.replace(/[._]/g, " ") ||
    "Kunde";

  const { data: neu, error: insErr } = await supabaseAdmin
    .from("kunden")
    .insert({
      name,
      email,
      telefon: opts.telefon?.trim() || null,
      typ: "privat",
      auth_user_id: opts.userId,
    })
    .select("id")
    .single();

  if (insErr) {
    if (isKundenRowUniqueViolation(insErr)) {
      const existingId = await findKundeIdByEmail(email);
      if (existingId) {
        const { data: existing } = await supabaseAdmin
          .from("kunden")
          .select("auth_user_id")
          .eq("id", existingId)
          .maybeSingle();
        const foreignAuth = existing?.auth_user_id as string | null | undefined;
        if (foreignAuth && foreignAuth !== opts.userId) {
          return {
            ok: false,
            error:
              "Diese E-Mail ist bereits mit einem anderen Portal-Konto verknüpft. Bitte wende dich an uns.",
          };
        }
        if (linkedByAuth?.id && linkedByAuth.id !== existingId) {
          await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
        }
        const { error: upErr } = await supabaseAdmin
          .from("kunden")
          .update({ auth_user_id: opts.userId, email })
          .eq("id", existingId);
        if (upErr) return fail(upErr);
        return { ok: true, kundeId: existingId };
      }
      if (isKundenEmailUniqueViolation(insErr)) {
        return fail(insErr);
      }
    }
    return fail(insErr);
  }

  if (!neu) {
    return fail("Kundenstamm konnte nicht angelegt werden.");
  }

  return { ok: true, kundeId: String(neu.id) };
}
