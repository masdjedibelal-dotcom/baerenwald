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

/**
 * Erzeugt/aktualisiert die Schadenakte (PDF) am Auftrag und setzt versicherungsakte_pdf_url.
 * No-op wenn Kostenträger nicht Versicherung.
 */
export async function ensureVersicherungsakteForAuftrag(
  auftragId: string,
  opts?: { actorId?: string | null; actorRolle?: string | null }
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const id = auftragId?.trim();
  if (!id) return { ok: false, message: "Auftrag fehlt." };

  const { data: auftrag, error } = await supabaseAdmin
    .from("auftraege")
    .select(
      "id, kunde_id, lead_id, titel, kostentraeger, versicherungs_nr, abnahme_protokoll_url, abnahme_datum, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !auftrag) {
    return { ok: false, message: error?.message ?? "Auftrag nicht gefunden." };
  }

  let lead: Record<string, unknown> | null = null;
  if (auftrag.lead_id) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select(
        "id, kostentraeger, versicherungs_nr, kontakt_nachricht, notizen, situation, melder_name, created_at, strasse, hausnummer, plz, kunde_objekt_id, auftraggeber_kunde_id"
      )
      .eq("id", auftrag.lead_id)
      .maybeSingle();
    lead = data;
  }

  const kt =
    String(auftrag.kostentraeger ?? lead?.kostentraeger ?? "").trim() || null;
  if (kt !== "versicherung") {
    return { ok: false, message: "Kostenträger ist nicht Versicherung." };
  }

  let versNr =
    String(auftrag.versicherungs_nr ?? lead?.versicherungs_nr ?? "").trim() ||
    null;
  let selbstbehaltEur: number | null = null;

  let orgName = "Verwaltung";
  const kundeId = auftrag.kunde_id
    ? String(auftrag.kunde_id)
    : lead?.auftraggeber_kunde_id
      ? String(lead.auftraggeber_kunde_id)
      : null;
  if (kundeId) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("name")
      .eq("id", kundeId)
      .maybeSingle();
    if (kunde?.name) orgName = String(kunde.name);
  }

  let objektTitel = String(auftrag.titel ?? "Objekt");
  let objektAdresse: string | undefined = adresseFrom({
    strasse: lead?.strasse as string | null,
    hausnummer: lead?.hausnummer as string | null,
    plz: lead?.plz as string | null,
  });
  const objektId = lead?.kunde_objekt_id
    ? String(lead.kunde_objekt_id)
    : null;
  if (objektId) {
    let { data: obj, error: objErr } = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "titel, strasse, hausnummer, plz, versicherer, versicherungs_nr, selbstbehalt_eur"
      )
      .eq("id", objektId)
      .maybeSingle();
    if (objErr && /versicherer|versicherungs_nr|selbstbehalt/i.test(objErr.message)) {
      ({ data: obj } = await supabaseAdmin
        .from("kunden_objekte")
        .select("titel, strasse, hausnummer, plz")
        .eq("id", objektId)
        .maybeSingle());
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

  const { data: befundRows } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select("titel, beschreibung, datum, foto_urls, eintrag_typ")
    .eq("auftrag_id", id)
    .order("datum", { ascending: true })
    .limit(40);

  const befundZeilen = (befundRows ?? [])
    .filter((r) => String(r.eintrag_typ ?? "") === "befund")
    .map((row) => ({
      datum: String(row.datum ?? ""),
      titel: String(row.titel ?? "Schadenbefund"),
      text: String(row.beschreibung ?? "").trim(),
      fotoCount: Array.isArray(row.foto_urls) ? row.foto_urls.length : 0,
    }));

  // Dual-Read: neue Positions-Einträge (Start/Fortschritt/Ergebnis) + Alt-BT
  const chronologie: Array<{ datum: string; text: string }> = [];
  const { data: posRows, error: posErr } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, leistung_name")
    .eq("auftrag_id", id);

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
          ? "Start"
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

  for (const row of befundRows ?? []) {
    chronologie.push({
      datum: String(row.datum ?? ""),
      text: `${String(row.titel ?? "Eintrag")}${
        row.eintrag_typ === "befund" ? " (Befund)" : ""
      }`,
    });
  }

  chronologie.sort((a, b) => a.datum.localeCompare(b.datum));

  const { data: rechnungen } = await supabaseAdmin
    .from("rechnungen")
    .select("rechnungsnummer, status, pdf_url")
    .eq("auftrag_id", id)
    .order("created_at", { ascending: false })
    .limit(3);

  const rechnungHinweis =
    (rechnungen ?? [])
      .map((r) => {
        const nr = r.rechnungsnummer?.trim() || "ohne Nr.";
        return `Rechnung ${nr} (Status: ${r.status ?? "—"})`;
      })
      .join("; ") || null;

  const abnahmeHinweis = auftrag.abnahme_protokoll_url
    ? `Abnahmeprotokoll vorhanden${
        auftrag.abnahme_datum ? ` (${auftrag.abnahme_datum})` : ""
      }.`
    : null;

  const pdfBytes = await generateVersicherungsaktePdf({
    orgName,
    objektTitel,
    objektAdresse,
    versicherungsNr: versNr,
    schadenNr: versNr,
    schadendatum:
      (lead?.created_at as string | undefined) ??
      (auftrag.created_at as string | undefined) ??
      null,
    kostentraegerLabel: kostentraegerLabel(kt),
    hergang: hergangFromLead({
      kontakt_nachricht: lead?.kontakt_nachricht as string | null,
      notizen: lead?.notizen as string | null,
      situation: lead?.situation as string | null,
      melder_name: lead?.melder_name as string | null,
      created_at: lead?.created_at as string | null,
    }),
    chronologie,
    befundZeilen,
    abnahmeHinweis,
    rechnungHinweis,
    selbstbehaltEur,
  });

  const path = `versicherungsakten/${id}.pdf`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, pdfBytes, { upsert: true, contentType: "application/pdf" });

  if (upErr) return { ok: false, message: upErr.message };

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const patch: Record<string, unknown> = {
    versicherungsakte_pdf_url: url,
    kostentraeger: "versicherung",
  };
  if (versNr) patch.versicherungs_nr = versNr;

  await supabaseAdmin.from("auftraege").update(patch).eq("id", id);

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: id,
    aktion: "versicherungsakte_erstellt",
    actorId: opts?.actorId ?? null,
    actorRolle: opts?.actorRolle ?? null,
    kundeId,
    payload: { url, versicherungs_nr: versNr },
  });

  return { ok: true, url };
}

/** Alle Aufträge eines Leads aktualisieren (nach Kostenträger-Setzen). */
export async function ensureVersicherungsakteForLead(
  leadId: string,
  opts?: { actorId?: string | null; actorRolle?: string | null }
): Promise<void> {
  const { data: rows } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("lead_id", leadId);

  for (const row of rows ?? []) {
    await ensureVersicherungsakteForAuftrag(String(row.id), opts);
  }
}
