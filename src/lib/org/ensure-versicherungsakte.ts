import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { generateVersicherungsTeilPdf } from "@/lib/org/generate-versicherungsakte-pdf";
import { buildVersicherungsakteSchadenAngaben } from "@/lib/org/versicherungsakte-schaden-angaben";
import {
  phaseStoragePath,
  resolveVersicherungPdfReadiness,
  type VersicherungPdfPhase,
  type VersicherungPdfReadiness,
} from "@/lib/org/versicherung-pdf-readiness";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET = "protokolle";

function adresseFrom(parts: {
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
}): string | undefined {
  const street = [parts.strasse, parts.hausnummer].filter(Boolean).join(" ").trim();
  const plz = parts.plz?.trim();
  const line = [street, plz].filter(Boolean).join(", ");
  return line || undefined;
}

type EnsureOpts = {
  actorId?: string | null;
  actorRolle?: string | null;
  phase?: VersicherungPdfPhase;
};

type LeadSignals = {
  hasHmBefund: boolean;
  hasHwBefund: boolean;
  hasHwUpdate: boolean;
  hmPathTaken: boolean;
  hasAuftrag: boolean;
  befundZeilen: Array<{
    datum: string;
    titel: string;
    text: string;
    fotoCount: number;
  }>;
  chronologie: Array<{ datum: string; text: string }>;
};

async function loadLeadSignals(leadId: string): Promise<LeadSignals> {
  const befundZeilen: LeadSignals["befundZeilen"] = [];
  const chronologie: LeadSignals["chronologie"] = [];
  let hasHmBefund = false;
  let hasHwBefund = false;
  let hasHwUpdate = false;

  const { data: leadBefund, error: befundErr } = await supabaseAdmin
    .from("lead_befunde")
    .select("id, durchgefuehrt_von, durchgefuehrt_am, ergebnis, vorlage_key")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!befundErr && leadBefund?.id) {
    const { data: punkte } = await supabaseAdmin
      .from("lead_befund_punkte")
      .select("titel, status, notiz, foto_refs, sort_order")
      .eq("befund_id", leadBefund.id)
      .order("sort_order", { ascending: true });

    const lines: string[] = [];
    let fotoCount = 0;
    let substance = Boolean(
      leadBefund.durchgefuehrt_am || leadBefund.ergebnis || leadBefund.durchgefuehrt_von
    );
    for (const p of punkte ?? []) {
      const st = String(p.status ?? "").trim() || "offen";
      const notiz = String(p.notiz ?? "").trim();
      lines.push(`• ${p.titel} [${st}]${notiz ? ` — ${notiz}` : ""}`);
      if (Array.isArray(p.foto_refs) && p.foto_refs.length) {
        fotoCount += p.foto_refs.length;
        substance = true;
      }
      if (notiz || (st && st !== "offen")) substance = true;
    }
    if (substance || lines.length > 0) {
      hasHmBefund = substance || lines.length > 0;
      const datum =
        String(leadBefund.durchgefuehrt_am ?? "").slice(0, 10) ||
        new Date().toISOString().slice(0, 10);
      const header = [
        leadBefund.durchgefuehrt_von
          ? `Durchgeführt von: ${leadBefund.durchgefuehrt_von}`
          : null,
        leadBefund.ergebnis ? `Ergebnis: ${leadBefund.ergebnis}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      befundZeilen.push({
        datum,
        titel: "Hausmeister-Vorbefund",
        text: [header, ...lines].filter(Boolean).join("\n"),
        fotoCount,
      });
      chronologie.push({ datum, text: "Hausmeister-Vorbefund" });
    }
  }

  const { data: auftraege } = await supabaseAdmin
    .from("auftraege")
    .select("id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const hasAuftrag = (auftraege ?? []).length > 0;

  for (const auftrag of auftraege ?? []) {
    const auftragId = String(auftrag.id);
    const { data: btRows } = await supabaseAdmin
      .from("auftrag_bautagebuch_eintraege")
      .select("titel, beschreibung, datum, foto_urls, eintrag_typ")
      .eq("auftrag_id", auftragId)
      .order("datum", { ascending: true })
      .limit(40);

    for (const row of btRows ?? []) {
      const typ = String(row.eintrag_typ ?? "");
      if (typ === "befund") {
        hasHwBefund = true;
        befundZeilen.push({
          datum: String(row.datum ?? ""),
          titel: String(row.titel ?? "Schadenbefund"),
          text: String(row.beschreibung ?? "").trim(),
          fotoCount: Array.isArray(row.foto_urls) ? row.foto_urls.length : 0,
        });
      } else {
        hasHwUpdate = true;
      }
      chronologie.push({
        datum: String(row.datum ?? ""),
        text: `${String(row.titel ?? "Eintrag")}${
          typ === "befund" ? " (Befund)" : ""
        }`,
      });
    }

    const { data: posRows, error: posErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .select("id, leistung_name")
      .eq("auftrag_id", auftragId);

    if (!posErr && posRows?.length) {
      const posIds = posRows.map((p) => String(p.id));
      const nameById = new Map(
        posRows.map((p) => [String(p.id), String(p.leistung_name ?? "Leistung")])
      );
      const { data: eintraege } = await supabaseAdmin
        .from("position_eintraege")
        .select("position_id, typ, beschreibung, created_at, ereignis_zeit")
        .in("position_id", posIds)
        .order("created_at", { ascending: true })
        .limit(80);

      for (const e of eintraege ?? []) {
        hasHwUpdate = true;
        const typ = String(e.typ ?? "");
        const label =
          typ === "start"
            ? "Update"
            : typ === "fortschritt"
              ? "Fortschritt"
              : typ === "ergebnis"
                ? "Ergebnis"
                : typ;
        chronologie.push({
          datum: String(e.ereignis_zeit ?? e.created_at ?? ""),
          text: `${nameById.get(String(e.position_id)) ?? "Position"} — ${label}${
            e.beschreibung ? `: ${String(e.beschreibung).slice(0, 120)}` : ""
          }`,
        });
      }
    }
  }

  chronologie.sort((a, b) => a.datum.localeCompare(b.datum));

  return {
    hasHmBefund,
    hasHwBefund,
    hasHwUpdate,
    hmPathTaken: false, // set by caller from hv status
    hasAuftrag,
    befundZeilen,
    chronologie,
  };
}

/** Readiness für UI / API — lädt Signale aus DB. */
export async function getVersicherungPdfReadinessForLead(
  leadId: string
): Promise<VersicherungPdfReadiness | { error: string }> {
  const id = leadId?.trim();
  if (!id) return { error: "Lead fehlt." };

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("id, kostentraeger, hv_meldung_status")
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) {
    return { error: error?.message ?? "Vorgang nicht gefunden." };
  }

  const signals = await loadLeadSignals(id);
  const hv = String(lead.hv_meldung_status ?? "")
    .trim()
    .toLowerCase();
  const hmPathTaken =
    hv === "hm_pruefung" || hv === "hm_erledigt" || signals.hasHmBefund;

  return resolveVersicherungPdfReadiness({
    kostentraeger: lead.kostentraeger,
    hvMeldungStatus: lead.hv_meldung_status,
    hasHmBefund: signals.hasHmBefund,
    hasHwBefund: signals.hasHwBefund,
    hasHwUpdate: signals.hasHwUpdate,
    hmPathTaken,
    hasAuftrag: signals.hasAuftrag,
  });
}

/** Während HM-Prüfung: Ursache-PDF gesperrt. */
export async function isVersicherungsakteBlockedByHmBefund(
  leadId: string
): Promise<boolean> {
  const id = leadId?.trim();
  if (!id) return false;
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("hv_meldung_status")
    .eq("id", id)
    .maybeSingle();
  return (
    String(lead?.hv_meldung_status ?? "")
      .trim()
      .toLowerCase() === "hm_pruefung"
  );
}

/**
 * Erzeugt Teil-PDF (meldung | ursache) und legt es in Storage ab.
 * Default phase = meldung (Auto-Schadenakte / Legacy).
 */
export async function ensureVersicherungsakteForLead(
  leadId: string,
  opts?: EnsureOpts
): Promise<{ ok: true; url: string; phase: VersicherungPdfPhase } | { ok: false; message: string }> {
  const id = leadId?.trim();
  if (!id) return { ok: false, message: "Lead fehlt." };
  const phase: VersicherungPdfPhase = opts?.phase ?? "meldung";

  const readiness = await getVersicherungPdfReadinessForLead(id);
  if ("error" in readiness) return { ok: false, message: readiness.error };

  const phaseStatus = phase === "meldung" ? readiness.meldung : readiness.ursache;
  if (!phaseStatus.ready) {
    return {
      ok: false,
      message: phaseStatus.blockers[0] ?? "PDF noch nicht freigeschaltet.",
    };
  }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select(
      "id, auftraggeber_kunde_id, kunde_id, kunde_objekt_id, kostentraeger, versicherungs_nr, schaden_nr, kontakt_name, kontakt_nachricht, notizen, situation, bereiche, zeitraum, melder_name, melder_einheit, melder_telefon, melder_email, created_at, strasse, hausnummer, plz, ort, funnel_daten"
    )
    .eq("id", id)
    .maybeSingle();

  if (leadErr || !lead) {
    return { ok: false, message: leadErr?.message ?? "Vorgang nicht gefunden." };
  }

  let versNr = String(lead.versicherungs_nr ?? "").trim() || null;
  let orgName = "Verwaltung";
  const absenderZeilen: string[] = [];
  let absenderTel: string | null = null;
  let absenderEmail: string | null = null;

  const kundeId = lead.auftraggeber_kunde_id
    ? String(lead.auftraggeber_kunde_id)
    : lead.kunde_id
      ? String(lead.kunde_id)
      : null;

  if (kundeId) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select(
        "name, org_anzeigename, email, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, strasse, hausnummer, plz, ort"
      )
      .eq("id", kundeId)
      .maybeSingle();
    if (kunde) {
      orgName =
        String(kunde.org_anzeigename ?? "").trim() ||
        String(kunde.name ?? "").trim() ||
        orgName;
      const street = [
        kunde.org_strasse ?? kunde.strasse,
        kunde.org_hausnummer ?? kunde.hausnummer,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const plzOrt = [
        kunde.org_plz ?? kunde.plz,
        kunde.org_ort ?? kunde.ort,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (street) absenderZeilen.push(street);
      if (plzOrt) absenderZeilen.push(plzOrt);
      absenderTel = String(kunde.org_telefon ?? "").trim() || null;
      absenderEmail = String(kunde.email ?? "").trim() || null;
    }
  }

  let objektTitel = "Objekt";
  let objektAdresse: string | undefined = adresseFrom({
    strasse: lead.strasse,
    hausnummer: lead.hausnummer,
    plz: lead.plz,
  });
  let objektForAngaben: {
    name: string;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
  } | null = null;
  const objektId = lead.kunde_objekt_id ? String(lead.kunde_objekt_id) : null;
  if (objektId) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel, strasse, hausnummer, plz, ort, versicherungs_nr")
      .eq("id", objektId)
      .maybeSingle();
    if (obj?.titel) objektTitel = String(obj.titel);
    objektAdresse =
      adresseFrom({
        strasse: obj?.strasse,
        hausnummer: obj?.hausnummer,
        plz: obj?.plz,
      }) ?? objektAdresse;
    if (!versNr && obj?.versicherungs_nr) {
      versNr = String(obj.versicherungs_nr).trim() || null;
    }
    if (obj) {
      objektForAngaben = {
        name: String(obj.titel ?? "Objekt"),
        strasse:
          [obj.strasse, obj.hausnummer].filter(Boolean).join(" ").trim() ||
          null,
        plz: obj.plz ? String(obj.plz) : null,
        ort: obj.ort ? String(obj.ort) : null,
      };
    }
  }

  const signals = await loadLeadSignals(id);

  const funnel = lead.funnel_daten as { fotos?: unknown } | null | undefined;
  const fotos = Array.isArray(funnel?.fotos) ? funnel.fotos : [];
  const fotoHinweis =
    fotos.length > 0
      ? `${fotos.length} Melde-Foto${fotos.length === 1 ? "" : "s"} im Vorgang hinterlegt.`
      : null;

  const schadenAngaben = buildVersicherungsakteSchadenAngaben({
    situation: lead.situation as string | null | undefined,
    bereiche: Array.isArray(lead.bereiche)
      ? (lead.bereiche as string[])
      : null,
    zeitraum: lead.zeitraum as string | null | undefined,
    plz: lead.plz as string | null | undefined,
    strasse: lead.strasse as string | null | undefined,
    hausnummer: lead.hausnummer as string | null | undefined,
    ort: lead.ort as string | null | undefined,
    melder_name: lead.melder_name as string | null | undefined,
    melder_einheit: lead.melder_einheit as string | null | undefined,
    melder_telefon: lead.melder_telefon as string | null | undefined,
    melder_email: lead.melder_email as string | null | undefined,
    kontakt_name: lead.kontakt_name as string | null | undefined,
    kontakt_nachricht: lead.kontakt_nachricht as string | null | undefined,
    notizen: lead.notizen as string | null | undefined,
    funnel_daten: lead.funnel_daten,
    objekt: objektForAngaben,
  });

  const pdfBytes = await generateVersicherungsTeilPdf({
    phase,
    absender: {
      name: orgName,
      zeilen: absenderZeilen,
      telefon: absenderTel,
      email: absenderEmail,
    },
    objektTitel,
    objektAdresse,
    versicherungsNr: versNr,
    schadenNr: String(lead.schaden_nr ?? "").trim() || null,
    schadendatum: (lead.created_at as string | undefined) ?? null,
    schadenAngaben,
    chronologie: phase === "ursache" ? signals.chronologie : [],
    befundZeilen: phase === "ursache" ? signals.befundZeilen : [],
    fotoHinweis: phase === "meldung" ? fotoHinweis : null,
  });

  const path = phaseStoragePath(id, phase);
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, pdfBytes, { upsert: true, contentType: "application/pdf" });

  if (upErr) return { ok: false, message: upErr.message };

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;
  const now = new Date().toISOString();

  // Legacy-Spalte: Meldung als „aktuelle“ Akte pflegen
  if (phase === "meldung") {
    const leadPatch: Record<string, unknown> = {
      versicherungsakte_pdf_url: url,
      versicherungsakte_erstellt_am: now,
      kostentraeger: "versicherung",
    };
    if (versNr) leadPatch.versicherungs_nr = versNr;
    const { error: leadUpErr } = await supabaseAdmin
      .from("leads")
      .update(leadPatch)
      .eq("id", id);
    if (leadUpErr && /versicherungsakte_pdf_url/i.test(leadUpErr.message)) {
      const { versicherungsakte_pdf_url: _u, ...without } = leadPatch;
      await supabaseAdmin.from("leads").update(without).eq("id", id);
    } else if (leadUpErr) {
      return { ok: false, message: leadUpErr.message };
    }

    const { data: auftraege } = await supabaseAdmin
      .from("auftraege")
      .select("id")
      .eq("lead_id", id);
    for (const a of auftraege ?? []) {
      const auftragPatch: Record<string, unknown> = {
        versicherungsakte_pdf_url: url,
        kostentraeger: "versicherung",
      };
      if (versNr) auftragPatch.versicherungs_nr = versNr;
      await supabaseAdmin.from("auftraege").update(auftragPatch).eq("id", a.id);
    }
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: id,
    aktion: "versicherungsakte_erstellt",
    actorId: opts?.actorId ?? null,
    actorRolle: opts?.actorRolle ?? null,
    kundeId,
    payload: { url, phase, versicherungs_nr: versNr },
  });

  return { ok: true, url, phase };
}

export async function ensureVersicherungsakteForAuftrag(
  auftragId: string,
  opts?: EnsureOpts
): Promise<{ ok: true; url: string; phase: VersicherungPdfPhase } | { ok: false; message: string }> {
  const id = auftragId?.trim();
  if (!id) return { ok: false, message: "Auftrag fehlt." };

  const { data: auftrag, error } = await supabaseAdmin
    .from("auftraege")
    .select("id, lead_id, kostentraeger")
    .eq("id", id)
    .maybeSingle();

  if (error || !auftrag) {
    return { ok: false, message: error?.message ?? "Auftrag nicht gefunden." };
  }

  if (auftrag.lead_id) {
    return ensureVersicherungsakteForLead(String(auftrag.lead_id), opts);
  }

  return { ok: false, message: "Auftrag ohne Lead — Schadenakte nicht möglich." };
}

/**
 * Objekt-Schalter: Kostenträger Versicherung + Schadenmeldung-PDF.
 * Ursache-PDF entsteht erst bei Readiness (nicht hier).
 */
export async function applyAutomatischeSchadenakteIfEnabled(
  leadId: string,
  opts?: EnsureOpts
): Promise<void> {
  const id = leadId?.trim();
  if (!id) return;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, anlass, kunde_objekt_id, kostentraeger, hv_meldung_status")
    .eq("id", id)
    .maybeSingle();

  if (!lead?.kunde_objekt_id) return;
  if (String(lead.anlass ?? "") !== "meldung") return;

  const { data: obj, error: objErr } = await supabaseAdmin
    .from("kunden_objekte")
    .select("automatische_schadenakte, versicherungs_nr")
    .eq("id", lead.kunde_objekt_id)
    .maybeSingle();

  if (objErr) {
    if (/automatische_schadenakte/i.test(objErr.message)) return;
    console.warn("[applyAutomatischeSchadenakte] objekt:", objErr.message);
    return;
  }
  if (!obj || obj.automatische_schadenakte !== true) return;

  const versNr = String(obj.versicherungs_nr ?? "").trim() || null;
  const patch: Record<string, unknown> = {
    kostentraeger: "versicherung",
    kostentraeger_vorgeschlagen: false,
  };
  if (versNr) patch.versicherungs_nr = versNr;

  await supabaseAdmin.from("leads").update(patch).eq("id", id);

  const result = await ensureVersicherungsakteForLead(id, {
    ...opts,
    phase: "meldung",
  });
  if (!result.ok) {
    console.warn("[applyAutomatischeSchadenakte]", result.message, { leadId: id });
  }
}
