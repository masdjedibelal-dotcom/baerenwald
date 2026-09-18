import {
  findKundeIdByEmail,
  isKundenEmailUniqueViolation,
  isKundenRowUniqueViolation,
  normalizeKundenEmail,
} from "@/lib/kunden/kunde-email";
import {
  isKundePortalGesperrt,
  KUNDE_PORTAL_GESPERRT_MESSAGE,
} from "@/lib/kunden/kunde-portal-gesperrt";
import { mapKundenPortalError } from "@/lib/kunden/kunde-portal-errors";
import {
  normalizePortalRegisterKundeTyp,
  portalModusForRegisterKundeTyp,
  type PortalRegisterKundeTyp,
} from "@/lib/portal/portal-register-kunde-typ";
import { supabaseAdmin } from "@/lib/supabase";

function fail(
  error: string | { code?: string; message?: string },
  opts?: { signOut?: boolean }
): LinkPortalKundeResult {
  const raw = typeof error === "string" ? error : error.message ?? "";
  if (raw && raw !== mapKundenPortalError(error)) {
    console.error("[linkPortalKunde]", raw);
  }
  return {
    ok: false,
    error: mapKundenPortalError(error),
    signOut: opts?.signOut,
  };
}

const PORTAL_ACCOUNT_CONFLICT =
  "Diese E-Mail ist bereits mit einem anderen Portal-Konto verknüpft. Bitte wenden Sie sich an uns.";

export type LinkPortalKundeResult =
  | { ok: true; kundeId: string }
  | { ok: false; error: string; signOut?: boolean };

type KundeCandidate = {
  id: string;
  auth_user_id: string | null;
  email: string | null;
  created_at: string | null;
  portal_modus?: string | null;
  typ?: string | null;
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

function isOrganisationKunde(k: {
  portal_modus?: string | null;
  typ?: string | null;
}): boolean {
  const modus = String(k.portal_modus ?? "")
    .trim()
    .toLowerCase();
  const typ = String(k.typ ?? "")
    .trim()
    .toLowerCase();
  return modus === "organisation" || typ === "hausverwaltung" || typ === "hv";
}

/** Alle Kundenstämme zur Login-E-Mail (nicht Name, nicht Telefon). */
async function findKundenByLoginEmail(
  email: string
): Promise<KundeCandidate[]> {
  const { data, error } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, email, created_at, portal_modus, typ")
    .ilike("email", email);

  if (error) throw new Error(error.message);
  return (data ?? []) as KundeCandidate[];
}

/**
 * Führender Kundenstamm für die Login-E-Mail:
 * Organisation/HV vor Hausmeister-Stub; sonst die meisten Portal-Daten.
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
    const aOrg = isOrganisationKunde(a) ? 1 : 0;
    const bOrg = isOrganisationKunde(b) ? 1 : 0;
    if (aOrg !== bOrg) return bOrg - aOrg;
    const aHm = String(a.portal_modus ?? "").toLowerCase() === "hausmeister" ? 1 : 0;
    const bHm = String(b.portal_modus ?? "").toLowerCase() === "hausmeister" ? 1 : 0;
    // HM-Stub nur wählen, wenn kein Org-Konto — unter Org sortieren wir schon oben
    if (aHm !== bHm) return aHm - bHm;
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

type HvPortalRolleMatch = {
  portalModus: "hausmeister" | "eigentuemer" | "mieter";
  name: string | null;
  telefon: string | null;
  hausmeisterId?: string;
  bewohnerIds?: string[];
};

/** E-Mail gehört zu HV-Objektakte (HM / Eigentümer / Mieter) — kein CRM-Privatkunde. */
async function resolveHvPortalRolleByEmail(
  email: string
): Promise<HvPortalRolleMatch | null> {
  const { data: hm } = await supabaseAdmin
    .from("org_hausmeister")
    .select("id, name, email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (hm?.id) {
    return {
      portalModus: "hausmeister",
      name: (hm.name as string | null)?.trim() || null,
      telefon: null,
      hausmeisterId: String(hm.id),
    };
  }

  const { data: bewohner } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("id, name, telefon, rolle")
    .ilike("email", email)
    .eq("aktiv", true)
    .is("anonymisiert_am", null)
    .limit(20);

  const rows = bewohner ?? [];
  if (!rows.length) return null;

  const isEigentuemer = rows.some(
    (r) => String(r.rolle ?? "").toLowerCase() === "eigentuemer"
  );
  const first = rows[0];
  return {
    portalModus: isEigentuemer ? "eigentuemer" : "mieter",
    name: (first?.name as string | null)?.trim() || null,
    telefon: (first?.telefon as string | null)?.trim() || null,
    bewohnerIds: rows.map((r) => String(r.id)).filter(Boolean),
  };
}

async function linkHvPortalRolleToKunde(
  portalKundeId: string,
  role: HvPortalRolleMatch
): Promise<void> {
  if (role.portalModus === "hausmeister" && role.hausmeisterId) {
    await supabaseAdmin
      .from("org_hausmeister")
      .update({
        portal_kunde_id: portalKundeId,
        portal_zugang: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", role.hausmeisterId);
    return;
  }
  if (role.bewohnerIds?.length) {
    await supabaseAdmin
      .from("einheit_bewohner")
      .update({ portal_kunde_id: portalKundeId })
      .in("id", role.bewohnerIds);
  }
}

function trimStamm(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t || null;
}

/** Stammdaten aus Selbstregistrierung → CRM `kunden`-Spalten. */
function buildRegisterStammPatch(opts: {
  name?: string | null;
  telefon?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  firma?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
}): Record<string, string | null> {
  const vorname = trimStamm(opts.vorname);
  const nachname = trimStamm(opts.nachname);
  const firma = trimStamm(opts.firma);
  const personName = [vorname, nachname].filter(Boolean).join(" ");
  const name =
    firma ||
    personName ||
    trimStamm(opts.name) ||
    null;

  const patch: Record<string, string | null> = {};
  if (name) patch.name = name;
  if (vorname) patch.vorname = vorname;
  if (nachname) patch.nachname = nachname;
  if (trimStamm(opts.strasse)) patch.strasse = trimStamm(opts.strasse);
  if (trimStamm(opts.hausnummer)) patch.hausnummer = trimStamm(opts.hausnummer);
  if (trimStamm(opts.plz)) patch.plz = trimStamm(opts.plz);
  if (trimStamm(opts.ort)) patch.ort = trimStamm(opts.ort);
  if (trimStamm(opts.telefon)) patch.telefon = trimStamm(opts.telefon);
  return patch;
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
  /** Selbstregistrierung: privat | gewerbe | hausverwaltung → CRM `kunden.typ` */
  typ?: PortalRegisterKundeTyp | string | null;
  vorname?: string | null;
  nachname?: string | null;
  firma?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
}): Promise<LinkPortalKundeResult> {
  const email = normalizeKundenEmail(opts.email);
  if (!email) {
    return { ok: false, error: "Keine E-Mail-Adresse im Konto." };
  }
  const registerTyp = normalizePortalRegisterKundeTyp(opts.typ);
  const stammPatch = buildRegisterStammPatch(opts);

  try {
    const gesperrt = await isKundePortalGesperrt({ email });
    if (gesperrt) {
      return { ok: false, error: KUNDE_PORTAL_GESPERRT_MESSAGE, signOut: true };
    }
  } catch (e) {
    console.error("[linkPortalKunde] Portal-Sperre-Check fehlgeschlagen:", e);
  }

  const { data: mitglied } = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("kunde_id")
    .eq("auth_user_id", opts.userId)
    .eq("aktiv", true)
    .maybeSingle();

  if (mitglied?.kunde_id) {
    return { ok: true, kundeId: String(mitglied.kunde_id) };
  }

  const { data: linkedByAuth } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, email, portal_modus, typ")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  // Bereits verknüpft + gleiche Login-E-Mail → ggf. Org vor HM-Stub bevorzugen.
  if (linkedByAuth?.id) {
    const linkedEmail = normalizeKundenEmail(linkedByAuth.email);
    if (linkedEmail === email) {
      if (!isOrganisationKunde(linkedByAuth)) {
        const orgForEmail = (await findKundenByLoginEmail(email)).find((k) =>
          isOrganisationKunde(k)
        );
        if (orgForEmail?.id && orgForEmail.id !== linkedByAuth.id) {
          await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
          const { error: upOrg } = await supabaseAdmin
            .from("kunden")
            .update({ auth_user_id: opts.userId, email })
            .eq("id", orgForEmail.id);
          if (!upOrg) {
            return { ok: true, kundeId: String(orgForEmail.id) };
          }
        }
      }
      return { ok: true, kundeId: String(linkedByAuth.id) };
    }
  }

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
        error: PORTAL_ACCOUNT_CONFLICT,
        signOut: true,
      };
    }

    if (linkedByAuth?.id && linkedByAuth.id !== canonical.id) {
      await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
    }

    const hvRole = await resolveHvPortalRolleByEmail(email);
    const { data: before } = await supabaseAdmin
      .from("kunden")
      .select("portal_modus")
      .eq("id", canonical.id)
      .maybeSingle();
    const keepOrgModus =
      (before?.portal_modus ?? "") === "organisation" &&
      (await import("@/lib/auth/baerenwald-primary-staff")).isBaerenwaldPrimaryStaffEmail(
        email
      );

    const { error: upErr } = await supabaseAdmin
      .from("kunden")
      .update({
        auth_user_id: opts.userId,
        email,
        ...stammPatch,
        ...(hvRole && !keepOrgModus ? { portal_modus: hvRole.portalModus } : {}),
      })
      .eq("id", canonical.id);

    if (upErr) return fail(upErr);
    if (hvRole?.portalModus === "hausmeister" && hvRole.hausmeisterId) {
      if (keepOrgModus) {
        const { ensureHausmeisterPortalActivation } = await import(
          "@/lib/org/ensure-hausmeister-portal"
        );
        const { data: hmRow } = await supabaseAdmin
          .from("org_hausmeister")
          .select("org_kunde_id")
          .eq("id", hvRole.hausmeisterId)
          .maybeSingle();
        if (hmRow?.org_kunde_id) {
          await ensureHausmeisterPortalActivation({
            orgHausmeisterId: hvRole.hausmeisterId,
            orgKundeId: String(hmRow.org_kunde_id),
          });
        }
      } else {
        await linkHvPortalRolleToKunde(String(canonical.id), hvRole);
      }
    } else if (hvRole) {
      await linkHvPortalRolleToKunde(String(canonical.id), hvRole);
    }
    return { ok: true, kundeId: String(canonical.id) };
  }

  if (linkedByAuth?.id) {
    await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
  }

  const name =
    stammPatch.name ||
    opts.name?.trim() ||
    email.split("@")[0]?.replace(/[._]/g, " ") ||
    "Kunde";

  // HV-Objektakte: E-Mail gehört zu Bewohner/Hausmeister → Portal-Stub, kein CRM-Stammtyp
  const hvRole = await resolveHvPortalRolleByEmail(email);
  const crmTyp: PortalRegisterKundeTyp = hvRole
    ? "privat"
    : registerTyp ?? "privat";
  const portalModus =
    hvRole?.portalModus ?? portalModusForRegisterKundeTyp(crmTyp);

  const { data: neu, error: insErr } = await supabaseAdmin
    .from("kunden")
    .insert({
      name: hvRole?.name || name,
      email,
      telefon:
        stammPatch.telefon ||
        opts.telefon?.trim() ||
        hvRole?.telefon ||
        null,
      typ: crmTyp,
      portal_modus: portalModus,
      auth_user_id: opts.userId,
      ...(stammPatch.vorname ? { vorname: stammPatch.vorname } : {}),
      ...(stammPatch.nachname ? { nachname: stammPatch.nachname } : {}),
      ...(stammPatch.strasse ? { strasse: stammPatch.strasse } : {}),
      ...(stammPatch.hausnummer ? { hausnummer: stammPatch.hausnummer } : {}),
      ...(stammPatch.plz ? { plz: stammPatch.plz } : {}),
      ...(stammPatch.ort ? { ort: stammPatch.ort } : {}),
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
            error: PORTAL_ACCOUNT_CONFLICT,
            signOut: true,
          };
        }
        if (linkedByAuth?.id && linkedByAuth.id !== existingId) {
          await detachAuthFromKunde(String(linkedByAuth.id), opts.userId);
        }
        const { error: upErr } = await supabaseAdmin
          .from("kunden")
          .update({
            auth_user_id: opts.userId,
            email,
            ...stammPatch,
            ...(hvRole ? { portal_modus: hvRole.portalModus } : {}),
          })
          .eq("id", existingId);
        if (upErr) return fail(upErr);
        if (hvRole) {
          await linkHvPortalRolleToKunde(existingId, hvRole);
        }
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

  const newId = String(neu.id);
  if (hvRole) {
    await linkHvPortalRolleToKunde(newId, hvRole);
  }

  return { ok: true, kundeId: newId };
}

/**
 * Schneller Lookup für bereits verknüpfte Sessions (APIs/Actions).
 * Kein Canonical-Recount — bei Miss → null, Caller kann voll linken.
 */
export async function resolveLinkedPortalKundeId(
  userId: string
): Promise<string | null> {
  const uid = userId?.trim();
  if (!uid) return null;

  const { data: mitglied } = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("kunde_id")
    .eq("auth_user_id", uid)
    .eq("aktiv", true)
    .maybeSingle();
  if (mitglied?.kunde_id) return String(mitglied.kunde_id);

  const { data: linked } = await supabaseAdmin
    .from("kunden")
    .select("id")
    .eq("auth_user_id", uid)
    .maybeSingle();
  return linked?.id ? String(linked.id) : null;
}
