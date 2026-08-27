import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { generateVersicherungsaktePdf } from "@/lib/org/generate-versicherungsakte-pdf";
import { kostentraegerLabel } from "@/lib/vorgang/kostentraeger";
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

function hergangFromLead(lead: {
  kontakt_nachricht?: string | null;
  notizen?: string | null;
  situation?: string | null;
  melder_name?: string | null;
  created_at?: string | null;
}): string {
  const bits: string[] = [];
  if (lead.created_at) {
    const d = new Date(lead.created_at).toLocaleDateString("de-DE");
    bits.push(
      `Am ${d} wurde der Schaden gemeldet` +
        (lead.melder_name ? ` (${lead.melder_name})` : "") +
        "."
    );
  }
  const body =
    lead.kontakt_nachricht?.trim() ||
    lead.notizen?.trim() ||
    lead.situation?.trim();
  if (body) bits.push(body);
  return bits.join(" ") || "Schadenmeldung aus dem Vorgang.";
}

type EnsureOpts = { actorId?: string | null; actorRolle?: string | null };

/** Während HM-Prüfung: keine Schadenakte — erst nach abgeschlossenem Befund. */
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
 * Erzeugt/aktualisiert die Schadenakte am Lead (+ sync auf Aufträge).
 * No-op wenn Kostenträger nicht Versicherung.
 * Blockiert während hv_meldung_status = hm_pruefung (Befund noch offen).
 */
export async function ensureVersicherungsakteForLead(
  leadId: string,
  opts?: EnsureOpts
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const id = leadId?.trim();
  if (!id) return { ok: false, message: "Lead fehlt." };

  if (await isVersicherungsakteBlockedByHmBefund(id)) {
    return {
      ok: false,
      message:
        "Schadenakte Versicherung erst nach abgeschlossenem Hausmeister-Befund.",
    };
  }

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select(
      "id, kostentraeger, versicherungs_nr, schaden_nr, kontakt_nachricht, notizen, situation, melder_name, created_at, strasse, hausnummer, plz, kunde_objekt_id, auftraggeber_kunde_id, kunde_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !lead) {
    return { ok: false, message: error?.message ?? "Lead nicht gefunden." };
  }

  const kt = String(lead.kostentraeger ?? "").trim() || null;
  if (kt !== "versicherung") {
    return { ok: false, message: "Kostenträger ist nicht Versicherung." };
  }

  let versNr = String(lead.versicherungs_nr ?? "").trim() || null;
  let selbstbehaltEur: number | null = null;

  let orgName = "Verwaltung";
  const kundeId = lead.auftraggeber_kunde_id
    ? String(lead.auftraggeber_kunde_id)
    : lead.kunde_id
      ? String(lead.kunde_id)
      : null;
  if (kundeId) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("name")
      .eq("id", kundeId)
      .maybeSingle();
    if (kunde?.name) orgName = String(kunde.name);
  }

  let objektTitel = "Objekt";
  let objektAdresse: string | undefined = adresseFrom({
    strasse: lead.strasse,
    hausnummer: lead.hausnummer,
    plz: lead.plz,
  });
  const objektId = lead.kunde_objekt_id ? String(lead.kunde_objekt_id) : null;
  if (objektId) {
    const firstObj = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "titel, strasse, hausnummer, plz, versicherer, versicherungs_nr, selbstbehalt_eur"
      )
      .eq("id", objektId)
      .maybeSingle();
    let obj: {
      titel?: string | null;
      strasse?: string | null;
      hausnummer?: string | null;
      plz?: string | null;
      versicherer?: string | null;
      versicherungs_nr?: string | null;
      selbstbehalt_eur?: number | null;
    } | null = firstObj.data;
    const objErr = firstObj.error;
    if (objErr && /versicherer|versicherungs_nr|selbstbehalt/i.test(objErr.message)) {
      const fallback = await supabaseAdmin
        .from("kunden_objekte")
        .select("titel, strasse, hausnummer, plz")
        .eq("id", objektId)
        .maybeSingle();
      obj = fallback.data;
    }
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
    selbstbehaltEur =
      obj?.selbstbehalt_eur != null ? Number(obj.selbstbehalt_eur) : null;
  }

  const { data: auftraege } = await supabaseAdmin
    .from("auftraege")
    .select(
      "id, titel, abnahme_protokoll_url, abnahme_datum, created_at, versicherungs_nr"
    )
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const primaryAuftrag = (auftraege ?? [])[0] ?? null;
  if (primaryAuftrag?.titel) objektTitel = String(primaryAuftrag.titel);
  if (!versNr && primaryAuftrag?.versicherungs_nr) {
    versNr = String(primaryAuftrag.versicherungs_nr).trim() || null;
  }

  const befundZeilen: Array<{
    datum: string;
    titel: string;
    text: string;
    fotoCount: number;
  }> = [];
  const chronologie: Array<{ datum: string; text: string }> = [];

  // HM-Vorbefund am Lead (Tabelle ggf. noch nicht migriert)
  const { data: leadBefund, error: befundErr } = await supabaseAdmin
    .from("lead_befunde")
    .select("id, durchgefuehrt_von, durchgefuehrt_am, ergebnis, vorlage_key")
    .eq("lead_id", id)
    .maybeSingle();

  if (!befundErr && leadBefund?.id) {
    const { data: punkte } = await supabaseAdmin
      .from("lead_befund_punkte")
      .select("titel, status, notiz, foto_refs, sort_order")
      .eq("befund_id", leadBefund.id)
      .order("sort_order", { ascending: true });

    const lines: string[] = [];
    let fotoCount = 0;
    for (const p of punkte ?? []) {
      const st = String(p.status ?? "").trim() || "offen";
      const notiz = String(p.notiz ?? "").trim();
      lines.push(`• ${p.titel} [${st}]${notiz ? ` — ${notiz}` : ""}`);
      if (Array.isArray(p.foto_refs)) fotoCount += p.foto_refs.length;
    }
    const header = [
      leadBefund.durchgefuehrt_von
        ? `Durchgeführt von: ${leadBefund.durchgefuehrt_von}`
        : null,
      leadBefund.ergebnis ? `Ergebnis: ${leadBefund.ergebnis}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const datum =
      String(leadBefund.durchgefuehrt_am ?? "").slice(0, 10) ||
      String(lead.created_at ?? "").slice(0, 10);
    befundZeilen.push({
      datum,
      titel: "Hausmeister-Vorbefund",
      text: [header, ...lines].filter(Boolean).join("\n"),
      fotoCount,
    });
    chronologie.push({
      datum,
      text: "Hausmeister-Vorbefund",
    });
  }

  for (const auftrag of auftraege ?? []) {
    const auftragId = String(auftrag.id);
    const { data: befundRows } = await supabaseAdmin
      .from("auftrag_bautagebuch_eintraege")
      .select("titel, beschreibung, datum, foto_urls, eintrag_typ")
      .eq("auftrag_id", auftragId)
      .order("datum", { ascending: true })
      .limit(40);

    for (const row of befundRows ?? []) {
      if (String(row.eintrag_typ ?? "") === "befund") {
        befundZeilen.push({
          datum: String(row.datum ?? ""),
          titel: String(row.titel ?? "Schadenbefund"),
          text: String(row.beschreibung ?? "").trim(),
          fotoCount: Array.isArray(row.foto_urls) ? row.foto_urls.length : 0,
        });
      }
      chronologie.push({
        datum: String(row.datum ?? ""),
        text: `${String(row.titel ?? "Eintrag")}${
          row.eintrag_typ === "befund" ? " (Befund)" : ""
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

  let rechnungHinweis: string | null = null;
  let abnahmeHinweis: string | null = null;
  if (primaryAuftrag) {
    const { data: rechnungen } = await supabaseAdmin
      .from("rechnungen")
      .select("rechnungsnummer, status, pdf_url")
      .eq("auftrag_id", primaryAuftrag.id)
      .order("created_at", { ascending: false })
      .limit(3);

    rechnungHinweis =
      (rechnungen ?? [])
        .map((r) => {
          const nr = r.rechnungsnummer?.trim() || "ohne Nr.";
          return `Rechnung ${nr} (Status: ${r.status ?? "—"})`;
        })
        .join("; ") || null;

    abnahmeHinweis = primaryAuftrag.abnahme_protokoll_url
      ? `Abnahmeprotokoll vorhanden${
          primaryAuftrag.abnahme_datum
            ? ` (${primaryAuftrag.abnahme_datum})`
            : ""
        }.`
      : null;
  }

  const pdfBytes = await generateVersicherungsaktePdf({
    orgName,
    objektTitel,
    objektAdresse,
    versicherungsNr: versNr,
    schadenNr: String(lead.schaden_nr ?? "").trim() || null,
    schadendatum: (lead.created_at as string | undefined) ?? null,
    kostentraegerLabel: kostentraegerLabel(kt),
    hergang: hergangFromLead({
      kontakt_nachricht: lead.kontakt_nachricht,
      notizen: lead.notizen,
      situation: lead.situation,
      melder_name: lead.melder_name,
      created_at: lead.created_at,
    }),
    chronologie,
    befundZeilen,
    abnahmeHinweis,
    rechnungHinweis,
    selbstbehaltEur,
  });

  const path = `versicherungsakten/lead-${id}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, pdfBytes, { upsert: true, contentType: "application/pdf" });

  if (upErr) return { ok: false, message: upErr.message };

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const now = new Date().toISOString();
  const leadPatch: Record<string, unknown> = {
    versicherungsakte_pdf_url: url,
    versicherungsakte_erstellt_am: now,
    kostentraeger: "versicherung",
  };
  if (versNr) leadPatch.versicherungs_nr = versNr;
  {
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
  }

  for (const a of auftraege ?? []) {
    const auftragPatch: Record<string, unknown> = {
      versicherungsakte_pdf_url: url,
      kostentraeger: "versicherung",
    };
    if (versNr) auftragPatch.versicherungs_nr = versNr;
    await supabaseAdmin.from("auftraege").update(auftragPatch).eq("id", a.id);
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: id,
    aktion: "versicherungsakte_erstellt",
    actorId: opts?.actorId ?? null,
    actorRolle: opts?.actorRolle ?? null,
    kundeId,
    payload: { url, versicherungs_nr: versNr },
  });

  return { ok: true, url };
}

/** Auftrag-Pfad: delegiert auf Lead (falls vorhanden), sonst Legacy no-op. */
export async function ensureVersicherungsakteForAuftrag(
  auftragId: string,
  opts?: EnsureOpts
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
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
 * Objekt-Schalter: Kostenträger Versicherung setzen + Akte erzeugen.
 * Nur bei anlass=meldung und automatische_schadenakte=true.
 * Mit Hausmeister-Prüfung: Kostenträger ggf. setzen, PDF erst nach Befund.
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

  // HM-Prüfung läuft: nur Kostenträger, Akte nach Befund-Abschluss
  if (
    String(lead.hv_meldung_status ?? "")
      .trim()
      .toLowerCase() === "hm_pruefung"
  ) {
    return;
  }

  const result = await ensureVersicherungsakteForLead(id, opts);
  if (!result.ok) {
    console.warn("[applyAutomatischeSchadenakte]", result.message, { leadId: id });
  }
}
