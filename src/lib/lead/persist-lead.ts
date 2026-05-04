import { Resend } from "resend";

import { SITE_CONFIG } from "@/lib/config";
import {
  buildInternNotification,
  buildKundeBestaetigung,
} from "@/lib/email/lead-mail-templates";
import {
  erneuernProjektTyp,
  isErneuernProjektBereich,
} from "@/lib/funnel/projekt-erneuern";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** CRM-Eingabe — kompatibel mit externem POST /api/lead und internem Funnel. */
export type PersistLeadInput = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  /** CRM-Feld; Alias: `nachricht` */
  notizen?: string | null;
  nachricht?: string | null;
  plz?: string | null;
  situation?: string | null;
  bereiche?: string[] | null;
  preis_min?: number | null;
  preis_max?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  zeitraum?: string | null;
  kundentyp?: string | null;
  /** Standard `website` → Bestätigungsmail wenn echte E-Mail */
  kanal?: string | null;
  funnel_daten?: unknown;
  /** Unterscheidung Rechner-Haupt / Beratung / Außerhalb / Komplex */
  funnel_quelle?:
    | "rechner_haupt"
    | "beratung"
    | "ausserhalb"
    | "komplex_rueckruf"
    | string;
};

export type PersistLeadResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status: number };

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function syntheticEmailFromPhone(t: string): string {
  const digits = t.replace(/\D/g, "");
  const tail = digits.slice(-15) || "x";
  return `lead-${tail}@telefon.invalid`;
}

const GU_PROJEKT_NAME: Record<string, string> = {
  ausbau_dg: "Dachausbau / DG",
  ausbau_keller: "Kellerausbau",
  grundriss_umbau: "Wanddurchbruch",
  terrasse_neu: "Terrasse neu",
  gartengestaltung: "Gartengestaltung",
};

/** Anzeige im Betreff der Kunden-Mail — erste Kachel / Schadensbereich */
const KAPUTT_GEWERK_LABEL: Record<string, string> = {
  bad: "Bad / Sanitär",
  wasser: "Wasser",
  sanitaer: "Sanitär",
  feuchtigkeit_schimmel: "Feuchte / Schimmel",
  heizung: "Heizung",
  strom: "Elektrik",
  elektrik: "Elektrik",
  elektro: "Elektrik",
  maler: "Maler",
  waende: "Wände",
  waende_boeden: "Wände / Böden",
  streichen: "Maler",
  fassade: "Fassade",
  boden: "Boden",
  terrasse: "Terrasse / Außen",
  dach: "Dach",
  garten: "Garten",
  baum: "Baum",
  trockenbau: "Umbau / Trockenbau",
  keller_dg: "Keller / DG",
  umbau: "Umbau",
  anbau: "Anbau",
  fenster: "Fenster / Türen",
};

function kaputtGewerkLabel(bereiche: string[] | undefined): string {
  const b = bereiche?.[0]?.trim();
  if (!b) return "—";
  return KAPUTT_GEWERK_LABEL[b] ?? b.replace(/_/g, " ");
}

function zeitraumDringlichkeitLabel(
  zeitraum: string | null | undefined
): string {
  switch (zeitraum) {
    case "sofort":
      return "Sofort";
    case "heute":
      return "Heute";
    case "diese_woche":
      return "Diese Woche";
    case "woche":
      return "Diese Woche";
    case "vier_wochen":
      return "Bis zu 4 Wochen";
    case "zwei_monate":
      return "2 Monate";
    case "sechs_monate":
      return "6 Monate";
    case "naechster_monat":
      return "Nächster Monat";
    case "naechste_saison":
      return "Nächste Saison";
    case "naechstes_jahr":
      return "Nächstes Jahr";
    case "flexibel":
      return "Flexibel";
    default:
      return zeitraum?.trim() || "—";
  }
}

function guProjektDisplayName(bereiche: string[]): string {
  const typ = erneuernProjektTyp(bereiche);
  if (typ && GU_PROJEKT_NAME[typ]) return GU_PROJEKT_NAME[typ];
  return bereiche[0]
    ? (GU_PROJEKT_NAME[bereiche[0]] ?? bereiche[0].replace(/_/g, " "))
    : "Projekt";
}

function situationDisplay(s: string | null): string | undefined {
  if (s == null || String(s).trim() === "") return undefined;
  const key = String(s).trim();
  const map: Record<string, string> = {
    kaputt: "Reparatur / Schaden",
    erneuern: "Erneuern / Umbau",
    gewerbe: "Gewerbe",
  };
  return map[key] ?? key;
}

function leistungSummary(
  situation: string | null,
  bereiche: string[]
): string | undefined {
  const s = situationDisplay(situation);
  const b = bereiche
    .filter(Boolean)
    .map((x) => x.replace(/_/g, " "))
    .join(", ");
  if (s && b) return `${s} · ${b}`;
  if (s) return s;
  if (b) return b;
  return undefined;
}

function formatPreisrahmen(
  preis_min?: number,
  preis_max?: number
): string | undefined {
  if (
    typeof preis_min === "number" &&
    typeof preis_max === "number" &&
    preis_min > 0 &&
    preis_max > 0
  ) {
    return `${preis_min.toLocaleString("de-DE")} – ${preis_max.toLocaleString("de-DE")} €`;
  }
  return undefined;
}

function funnelQuelleDisplay(q: string): string {
  switch (q) {
    case "rechner_haupt":
      return "Rechner (Website)";
    case "beratung":
      return "Beratung";
    case "ausserhalb":
      return "Außerhalb";
    case "komplex_rueckruf":
      return "Komplex / Rückruf";
    default:
      return q || "—";
  }
}

function buildKundenBestaetigungSubject(raw: {
  situation: string | null;
  bereiche: string[];
  zeitraum: string | null;
  plz: string;
}): string {
  const { situation, bereiche, zeitraum, plz } = raw;
  if (situation === "kaputt") {
    const gewerk = kaputtGewerkLabel(bereiche);
    const dring = zeitraumDringlichkeitLabel(zeitraum);
    return `[Reparatur-Anfrage] - ${gewerk} - ${dring}`;
  }
  if (
    situation === "erneuern" &&
    bereiche.length > 0 &&
    isErneuernProjektBereich(bereiche)
  ) {
    const projekt = guProjektDisplayName(bereiche);
    const plzPart = plz.trim() || "—";
    return `[GU-PROJEKT] - ${projekt} - ${plzPart}`;
  }
  return "Deine Anfrage ist bei uns eingegangen";
}

function mergeFunnelDaten(
  funnel_daten: unknown,
  funnel_quelle: string | undefined,
  ctx: { situation?: string | null; bereiche?: string[] | null }
): unknown {
  const base =
    funnel_daten &&
    typeof funnel_daten === "object" &&
    !Array.isArray(funnel_daten)
      ? (funnel_daten as Record<string, unknown>)
      : {};
  const out: Record<string, unknown> = {
    ...base,
    funnel_quelle: funnel_quelle ?? "rechner_haupt",
  };
  const bereiche = Array.isArray(ctx.bereiche) ? ctx.bereiche : [];
  if (
    ctx.situation === "erneuern" &&
    bereiche.length > 0 &&
    isErneuernProjektBereich(bereiche)
  ) {
    out.GU_Service = true;
  }
  return out;
}

/** JSON-taugliche Kopie — vermeidet Postgres/JSONB-Fehler durch nicht-serialisierbare Werte. */
function sanitizeFunnelDatenJson(input: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(input ?? null));
  } catch {
    return {
      funnel_quelle: "rechner_haupt",
      _sanitize_error: true as const,
    };
  }
}

/** Nur Werte, die zur Supabase-Spalte / zum Funnel-Typ passen — verhindert Check-Constraint-Fehler. */
function normalizeKundentypForDb(
  raw: string | null | undefined
): "eigentuemer" | "mieter" | "hausverwaltung" | null {
  if (raw == null || raw === "") return null;
  const t = String(raw).trim().toLowerCase();
  if (t === "eigentuemer" || t === "mieter" || t === "hausverwaltung") {
    return t;
  }
  return null;
}

function persistExceptionMessage(e: unknown): string {
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

/** In Netlify/Dev-Logs siehst du die volle Meldung; optional UI-Detail mit LEAD_ERROR_DETAIL=1 */
function persistFailureFromException(e: unknown): PersistLeadResult {
  const detail = persistExceptionMessage(e);
  console.error("[persistLead]", detail, e);
  const exposeDetail =
    process.env.NODE_ENV === "development" ||
    process.env.LEAD_ERROR_DETAIL === "1";
  return {
    ok: false,
    status: 500,
    error: exposeDetail
      ? `Speichern fehlgeschlagen: ${detail}`
      : "Speichern fehlgeschlagen. Bitte später erneut oder kurz anrufen — wir prüfen den Vorgang.",
  };
}

/**
 * Ein Lead in Supabase anlegen (Kunde, Lead, Status-Historie) + optional Resend.
 * Validierung: `name` Pflicht; mindestens eine Kontaktmöglichkeit (E-Mail oder Telefon, Telefon mind. 3 Zeichen).
 */
export async function persistLead(
  raw: PersistLeadInput
): Promise<PersistLeadResult> {
  try {
    return await persistLeadInner(raw);
  } catch (e) {
    return persistFailureFromException(e);
  }
}

async function persistLeadInner(
  raw: PersistLeadInput
): Promise<PersistLeadResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Supabase ist nicht konfiguriert (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).",
      status: 503,
    };
  }

  const name = (raw.name ?? "").trim();
  const emailRaw = (raw.email ?? "").trim();
  const telefon = (raw.telefon ?? "").trim();
  const notizen =
    (raw.notizen ?? raw.nachricht ?? "").trim() ||
    undefined;
  const situation = raw.situation ?? null;
  const bereiche = Array.isArray(raw.bereiche) ? raw.bereiche : [];
  const preis_min = raw.preis_min ?? raw.priceMin ?? 0;
  const preis_max = raw.preis_max ?? raw.priceMax ?? 0;
  const plz = (raw.plz ?? "").trim();
  const zeitraum = raw.zeitraum ?? null;
  const kundentyp = normalizeKundentypForDb(raw.kundentyp ?? null);
  const kanal = (raw.kanal ?? "website").trim() || "website";
  const funnel_quelle = raw.funnel_quelle ?? "rechner_haupt";
  const funnel_daten = sanitizeFunnelDatenJson(
    mergeFunnelDaten(raw.funnel_daten, funnel_quelle, {
      situation,
      bereiche,
    })
  );

  if (!name) {
    return { ok: false, error: "Name ist ein Pflichtfeld.", status: 400 };
  }

  const hasEmail = emailRaw.length > 0 && isValidEmail(emailRaw);
  const hasTel = telefon.length >= 3;
  if (!hasEmail && !hasTel) {
    return {
      ok: false,
      error:
        "Bitte mindestens eine gültige E-Mail oder eine Telefonnummer (mind. 3 Zeichen) angeben.",
      status: 400,
    };
  }

  const typ = situation === "gewerbe" ? "gewerbe" : "privat";

  const emailForKunde =
    hasEmail ? emailRaw.toLowerCase() : syntheticEmailFromPhone(telefon);

  let kunde_id: string | undefined;

  /** Ohne Limit liefert `.maybeSingle()` einen Fehler, wenn die DB mehrere Treffer hat (Duplikat-E-Mail/-Telefon). */
  if (hasEmail) {
    const { data: byMail, error: errMail } = await supabaseAdmin
      .from("kunden")
      .select("id")
      .eq("email", emailRaw.toLowerCase())
      .limit(1)
      .maybeSingle();
    if (errMail) throw errMail;
    kunde_id = byMail?.id as string | undefined;
  }

  if (!kunde_id && hasTel) {
    const { data: byTel, error: errTel } = await supabaseAdmin
      .from("kunden")
      .select("id")
      .eq("telefon", telefon)
      .limit(1)
      .maybeSingle();
    if (errTel) throw errTel;
    kunde_id = byTel?.id as string | undefined;
  }

  if (!kunde_id) {
    const { data: neuerKunde, error: kundeError } = await supabaseAdmin
      .from("kunden")
      .insert({
        name,
        email: emailForKunde,
        telefon: telefon || null,
        plz: plz || null,
        typ,
      })
      .select("id")
      .single();

    if (kundeError) throw kundeError;
    kunde_id = neuerKunde.id as string;
  }

  const kontakt_email_row = hasEmail ? emailRaw.toLowerCase() : emailForKunde;

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .insert({
      kunde_id,
      kanal,
      status: "neu",
      situation,
      bereiche,
      preis_min,
      preis_max,
      plz: plz || null,
      zeitraum,
      kundentyp,
      funnel_daten,
      kontakt_name: name,
      kontakt_email: kontakt_email_row,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: notizen ?? null,
    })
    .select("id")
    .single();

  if (leadError) throw leadError;

  const leadId = String((lead as { id: string }).id);

  const { error: histError } = await supabaseAdmin
    .from("leads_status_history")
    .insert({
      lead_id: leadId,
      status_neu: "neu",
      notiz: "Lead via Website erstellt",
    });

  if (histError) {
    console.error("[persistLead] leads_status_history:", histError);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const internTo =
    process.env.INTERN_EMAIL?.trim() || SITE_CONFIG.email?.trim();
  const resendFromCustomer =
    process.env.RESEND_FROM_CUSTOMER ??
    "Bärenwald München <anfragen@baerenwaldmuenchen.de>";
  const resendFromSystem =
    process.env.RESEND_FROM_SYSTEM ??
    "System <system@baerenwaldmuenchen.de>";

  if (resendKey) {
    const resend = new Resend(resendKey);
    const dashboardBase =
      process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "") ?? "";
    const dashboardUrl =
      dashboardBase && leadId
        ? `${dashboardBase}/anfragen/${encodeURIComponent(leadId)}`
        : undefined;

    if (kanal === "website" && hasEmail) {
      try {
        await resend.emails.send({
          from: resendFromCustomer,
          to: emailRaw.toLowerCase(),
          subject: buildKundenBestaetigungSubject({
            situation,
            bereiche,
            zeitraum,
            plz,
          }),
          html: buildKundeBestaetigung({
            name,
            leistung: leistungSummary(situation, bereiche),
            preis: formatPreisrahmen(preis_min, preis_max),
          }),
        });
      } catch (e) {
        console.error("[persistLead] Resend Kunde:", e);
      }
    }

    if (internTo) {
      try {
        await resend.emails.send({
          from: resendFromSystem,
          to: internTo,
          subject: `Neue Anfrage: ${name} — ${bereiche.join(", ") || "—"}`,
          html: buildInternNotification({
            name,
            email: kontakt_email_row,
            telefon: telefon || undefined,
            plz: plz || undefined,
            situation: situationDisplay(situation) ?? situation ?? undefined,
            bereiche: bereiche.length > 0 ? bereiche : undefined,
            preis: formatPreisrahmen(preis_min, preis_max),
            notizen: notizen ?? undefined,
            dashboardUrl,
            quelle: funnelQuelleDisplay(String(funnel_quelle)),
            createdAt: new Date().toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
            leadId,
          }),
        });
      } catch (e) {
        console.error("[persistLead] Resend intern:", e);
      }
    }
  } else {
    console.warn("[persistLead] RESEND_API_KEY fehlt — keine E-Mails versendet");
  }

  return { ok: true, id: leadId };
}

