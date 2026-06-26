"use server";

import { revalidatePath } from "next/cache";

import {
  buildPartnerHwKonditionenFromEingabe,
  parsePartnerKonditionenEingabe,
} from "@/lib/partner/apply-partner-hw-konditionen";
import {
  isPartnerAnfrageBestaetigungAusstehend,
  isPartnerAnfrageKonditionenBearbeitbar,
  isPartnerAnfrageOffen,
} from "@/lib/partner/partner-anfrage-status";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from "@/lib/partner/handwerker-ablehnung";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  MAIL_PDF_LINK_TTL_SEC,
  sendPartnerInternalAnfrageAntwortMail,
  sendPartnerInternalAngebotMail,
} from "@/lib/partner/partner-mail";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAnfrageAntwortResult =
  | { ok: true }
  | { ok: false; error: string };

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

export async function respondPartnerAnfrage(opts: {
  anfrageId: string;
  antwort: "akzeptiert" | "abgelehnt";
  konditionenJson?: string;
  grund?: string;
  notiz?: string;
}): Promise<PartnerAnfrageAntwortResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const grundRaw = opts.grund?.trim() ?? "";
  if (opts.antwort === "abgelehnt") {
    if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
      return { ok: false, error: "Bitte einen gültigen Ablehnungsgrund wählen." };
    }
  }

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      angebot_id,
      handwerker_id,
      gewerk_id,
      antwort_at,
      gesendet_at,
      status,
      hw_status,
      handwerker(name, firma),
      gewerke(name),
      angebote(
        positionen,
        kunde_objekt_id,
        kunden(plz, ort),
        leads(plz, zeitraum, bereiche, funnel_daten, kunde_objekt_id)
      )
    `
    )
    .eq("id", opts.anfrageId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Anfrage nicht gefunden." };
  }

  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung für diese Anfrage." };
  }

  const hwStEarly = String((row as { hw_status?: string }).hw_status ?? "").toLowerCase();

  if (hwStEarly === "bestaetigt" && opts.antwort === "akzeptiert") {
    const { error: confirmErr } = await supabaseAdmin
      .from("angebot_handwerker")
      .update({ hw_status: "uebernommen" })
      .eq("id", opts.anfrageId)
      .eq("handwerker_id", link.handwerkerId)
      .eq("hw_status", "bestaetigt");

    if (confirmErr) return { ok: false, error: confirmErr.message };

    revalidatePath("/partner");
    return { ok: true };
  }

  if (hwStEarly === "uebernommen") {
    return {
      ok: false,
      error:
        "Die Konditionen wurden bereits bestätigt. Bitte unter „Angebote“ fortfahren.",
    };
  }

  const raw = row as Record<string, unknown>;
  const angebote = one(raw.angebote) as {
    positionen?: unknown;
    leads?: { plz?: string | null; zeitraum?: string | null; bereiche?: unknown; funnel_daten?: unknown } | Array<{
      plz?: string | null;
      zeitraum?: string | null;
      bereiche?: unknown;
      funnel_daten?: unknown;
    }> | null;
  } | null;
  const leadRow = angebote ? one(angebote.leads) : null;
  const hwSt = String((row as { hw_status?: string }).hw_status ?? "").toLowerCase();
  const hwEingereichtAt = (row as { hw_eingereicht_at?: string | null }).hw_eingereicht_at;
  const isRueckfrage = Boolean(row.antwort_at) && (hwSt === "rueckfrage" || hwSt === "abgelehnt");
  const konditionenAusstehend =
    Boolean(row.antwort_at) && !hwEingereichtAt && !isRueckfrage;

  if (hwSt === "eingereicht" && !isRueckfrage) {
    return {
      ok: false,
      error:
        "Dein Angebot wird bereits geprüft. Bitte warte auf die Rückmeldung von Bärenwald.",
    };
  }

  if (
    row.antwort_at &&
    !isRueckfrage &&
    !konditionenAusstehend &&
    hwSt !== "bestaetigt"
  ) {
    return { ok: false, error: "Du hast bereits geantwortet." };
  }

  const timingItem = {
    status: String(row.status ?? ""),
    antwort_at: row.antwort_at as string | null | undefined,
    gesendet_at: (row as { gesendet_at?: string | null }).gesendet_at,
    hw_status: (row as { hw_status?: string | null }).hw_status ?? undefined,
    hw_eingereicht_at: hwEingereichtAt ?? undefined,
    zeitraum: leadRow?.zeitraum?.trim() || "",
    lead: leadRow
      ? {
          zeitraum: leadRow.zeitraum,
          bereiche: leadRow.bereiche as string[] | undefined,
          funnel_daten: leadRow.funnel_daten,
        }
      : null,
  };

  if (
    !isPartnerAnfrageKonditionenBearbeitbar(timingItem) &&
    !isPartnerAnfrageOffen(timingItem) &&
    !isPartnerAnfrageBestaetigungAusstehend(timingItem)
  ) {
    return { ok: false, error: "Diese Anfrage kann nicht mehr beantwortet werden." };
  }

  const now = new Date().toISOString();
  const notiz = opts.notiz?.trim() || null;
  const ablehnungGrundDb =
    opts.antwort === "abgelehnt" && isHandwerkerAblehnungGrund(grundRaw)
      ? grundRaw
      : null;

  if (opts.antwort === "abgelehnt") {
    const { error: upErr } = await supabaseAdmin
      .from("angebot_handwerker")
      .update({
        status: "abgelehnt",
        antwort_at: now,
        antwort_notiz: notiz,
        ablehnung_grund: ablehnungGrundDb,
        hw_status: null,
      })
      .eq("id", opts.anfrageId)
      .eq("handwerker_id", link.handwerkerId);

    if (upErr) return { ok: false, error: upErr.message };

    const hw = one(raw.handwerker) as { name: string } | null;
    const gw = one(raw.gewerke) as { name: string } | null;
    const grundLabel =
      ablehnungGrundDb && isHandwerkerAblehnungGrund(ablehnungGrundDb)
        ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[ablehnungGrundDb]
        : null;

    await sendPartnerInternalAnfrageAntwortMail({
      handwerkerName: hw?.name?.trim() || "Partner",
      gewerkName: gw?.name?.trim() || "Gewerk",
      angenommen: false,
      ablehnungGrundLabel: grundLabel,
      notiz,
      angebotId: String(raw.angebot_id),
      partnerAngebotPortalUrl: null,
    });

    revalidatePath("/partner");
    return { ok: true };
  }

  if (isPartnerAnfrageBestaetigungAusstehend(timingItem)) {
    return {
      ok: false,
      error: "Bitte zuerst die Konditionen bestätigen.",
    };
  }

  const konditionenRaw = opts.konditionenJson?.trim() ?? "";
  if (!konditionenRaw) {
    return { ok: false, error: "Bitte die Konditionen je Leistung angeben." };
  }

  const parsed = parsePartnerKonditionenEingabe(konditionenRaw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const built = buildPartnerHwKonditionenFromEingabe({
    positionenRaw: angebote?.positionen,
    gewerkId: String((row as { gewerk_id?: string }).gewerk_id ?? ""),
    eingabe: parsed.rows,
  });
  if (!built.ok) return { ok: false, error: built.error };

  const konditionen = built.konditionen;
  konditionen.eingereicht_at = now;

  const updatePayload = {
    status: "akzeptiert",
    antwort_at: isRueckfrage ? row.antwort_at : now,
    antwort_notiz: notiz,
    ablehnung_grund: null,
    hw_konditionen: konditionen,
    hw_preis_netto: built.preisNetto,
    hw_preis_brutto: built.preisBrutto,
    hw_eingereicht_at: now,
    hw_status: "eingereicht",
    hw_notiz: notiz,
    hw_crm_notiz: null,
    hw_crm_antwort_at: null,
  };

  const { error: upErr } = isRueckfrage
    ? await supabaseAdmin
        .from("angebot_handwerker")
        .update(updatePayload)
        .eq("id", opts.anfrageId)
        .eq("handwerker_id", link.handwerkerId)
        .in("hw_status", ["rueckfrage", "abgelehnt"])
    : konditionenAusstehend
      ? await supabaseAdmin
          .from("angebot_handwerker")
          .update(updatePayload)
          .eq("id", opts.anfrageId)
          .eq("handwerker_id", link.handwerkerId)
          .is("hw_eingereicht_at", null)
      : await supabaseAdmin
          .from("angebot_handwerker")
          .update(updatePayload)
          .eq("id", opts.anfrageId)
          .eq("handwerker_id", link.handwerkerId)
          .is("antwort_at", null);

  if (upErr) return { ok: false, error: upErr.message };

  const hw = one(raw.handwerker) as { name: string; firma?: string | null } | null;
  const gw = one(raw.gewerke) as { name: string } | null;
  const artLabel =
    konditionen.art === "bestaetigt" ? "Konditionen bestätigt" : "Preise angepasst";

  if (!isRueckfrage) {
    await sendPartnerInternalAnfrageAntwortMail({
      handwerkerName: hw?.name?.trim() || "Partner",
      gewerkName: gw?.name?.trim() || "Gewerk",
      angenommen: true,
      ablehnungGrundLabel: null,
      notiz,
      angebotId: String(raw.angebot_id),
      partnerAngebotPortalUrl: null,
    });
  }

  const ang = angebote;
  const kunde = ang
    ? one(
        (ang as { kunden?: unknown }).kunden as
          | { plz?: string | null }
          | { plz?: string | null }[]
          | null
      )
    : null;

  void sendPartnerInternalAngebotMail({
    handwerkerName: hw?.name?.trim() || "Partner",
    firma: hw?.firma ?? null,
    gewerkName: gw?.name?.trim() || "Gewerk",
    plz:
      (kunde as { plz?: string | null } | null)?.plz?.trim() ||
      leadRow?.plz?.trim() ||
      "—",
    preisNetto: built.preisNetto,
    preisBrutto: built.preisBrutto,
    angebotId: String(raw.angebot_id),
    angebotPdfUrl: null,
    konditionenArt: artLabel,
    positionen: konditionen.positionen.map((p) => ({
      leistung: p.leistung,
      ekNetto: p.ek_netto,
      hwNetto: p.hw_netto,
      geaendert: p.geaendert,
      hwNotiz: p.hw_notiz,
    })),
  });

  revalidatePath("/partner");
  return { ok: true };
}
