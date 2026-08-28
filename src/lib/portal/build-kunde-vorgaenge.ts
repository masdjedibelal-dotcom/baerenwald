import { labelSituation, labelBereich } from "@/lib/lead-funnel-labels";
import {
  fachdetailRowsFromFunnelDaten,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { parseMeldeUrsachenCheck } from "@/lib/org/melde-ursachen";
import {
  buildAnfrageCardMeta,
  buildAnfragePortalSections,
  formatAnfrageStrasseHausnummer,
  formatAnfrageZeitraum,
  formatMockVorgangListSubtitle,
  resolveAnfrageAdresse,
  resolveAnfrageMelder,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import {
  buildAngebotCardMeta,
  buildAngebotPortalSections,
  type PortalAngebotPositionDisplay,
} from "@/lib/portal/portal-angebot-display";
import {
  buildAuftragCardMeta,
  buildAuftragPortalSections,
} from "@/lib/portal/portal-auftrag-display";
import {
  buildKundeAuftragPositionenDisplay,
  hatOffeneKundeAuftragAenderung,
  type KundeAuftragPositionInput,
  resolveKundeAuftragGesamtBrutto,
} from "@/lib/portal/kunde-auftrag-aenderung";
import {
  portalAnsprechpartnerFallback,
  type PortalAnsprechpartner,
} from "@/lib/portal/portal-ansprechpartner";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";
import { isAngebotPortalSichtbar } from "@/lib/portal/portal-angebot-sichtbarkeit";
import { isLeadPortalListbar } from "@/lib/portal/portal-lead-sichtbarkeit";
import {
  collectVorgangDokumente,
  excludeMeldeFunnelFotosFromDokumente,
  filterPortalDokumenteForViewer,
} from "@/lib/portal/portal-dokumente";
import { buildPortalAbnahmeCheckliste } from "@/lib/portal/abnahme-checkliste";
import type { PortalAbnahmeCheckliste } from "@/lib/portal/portal-detail-item";
import {
  type KundePortalDetailItem,
  type PortalBautagebuchEntry,
} from "@/lib/portal/portal-detail-item";
import { sanitizeCustomerText } from "@/lib/portal/portal-display";
import { vorgangFeedbackBereit } from "@/lib/portal/vorgang-feedback-eligibility";
import { resolveKundeVorgangStatus } from "@/lib/portal/kunde-vorgang-status";
import { isHvPortalLead } from "@/lib/portal/hv-portal-lead";
import { meldeStatusUrl } from "@/lib/melde/melde-tracking";
import {
  hasMieterTerminPhase,
  hasOffeneTerminvorschlaege,
  type PortalTerminSlot,
} from "@/lib/portal/portal-termin";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import {
  resolvePortalBuildRole,
  resolvePortalKundeVorgangStatus,
} from "@/lib/crm-vorgang/portal-resolve";
import { resolveHvWartetAufHw } from "@/lib/portal2/hv-wartet-auf-hw";
import { formatPreisspanneDisplay } from "@/lib/org/hv-meldung-workflow";
import {
  buildMeldeVorgangTitel,
  leadIstMeldeTitelQuelle,
  titelFromFunnelLeistungen,
} from "@/lib/org/melde-vorgang-titel";

function meldeFotosFromFunnel(funnelDaten: unknown): string[] {
  const fd = funnelDaten as { fotos?: unknown } | null | undefined;
  if (!Array.isArray(fd?.fotos)) return [];
  return fd.fotos
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, 12);
}

type PortalLead = PortalAnfrageLeadSource & {
  id: string;
  situation?: string | null;
  bereiche?: string[] | null;
  created_at?: string | null;
  status?: string | null;
  vorgang_phase?: string | null;
  objekt?: PortalObjekt | null;
  plz?: string | null;
  dokumente?: PortalDokument[];
  anlass?: string | null;
  kanal?: string | null;
  auftraggeber_kunde_id?: string | null;
  kunde_objekt_id?: string | null;
  hv_meldung_status?: string | null;
  org_freigabe_status?: string | null;
  freigabe_bypass_grund?: string | null;
  kontakt_name?: string | null;
  melde_tracking_token?: string | null;
  melder_name?: string | null;
  melder_einheit?: string | null;
  melder_telefon?: string | null;
  melder_email?: string | null;
  kostentraeger?: string | null;
  kostentraeger_vorgeschlagen?: boolean | null;
  versicherungs_nr?: string | null;
  versicherungsakte_pdf_url?: string | null;
  schaden_nr?: string | null;
  schaden_nr_geaendert_am?: string | null;
  versicherungs_nr_geaendert_am?: string | null;
  versicherungsakte_erstellt_am?: string | null;
  erfassung_von?: string | null;
  funnel_daten?: unknown;
  kontakt_nachricht?: string | null;
  notizen?: string | null;
};

/** Preisindikation aus Mieter-Meldung — nur für HV, nicht für Mieter-View. */
function meldePreisIndikationFromLead(
  lead: Pick<PortalLead, "preis_min" | "preis_max" | "preis_unsicher">,
  hvMieterView: boolean
): string | null {
  if (hvMieterView) return null;
  const min = lead.preis_min;
  const max = lead.preis_max;
  if (lead.preis_unsicher) {
    return formatPreisspanneDisplay(min, max, true);
  }
  if (min == null && max == null) return null;
  if ((min ?? 0) <= 0 && (max ?? 0) <= 0) return null;
  return formatPreisspanneDisplay(min, max, false);
}

function resolveMelderStatusUrl(lead: PortalLead): string | undefined {
  const token = lead.melde_tracking_token?.trim();
  if (!token || !isHvPortalLead(lead)) return undefined;
  return meldeStatusUrl(token);
}

function normPortalId(id: string | null | undefined): string | null {
  const s = id != null ? String(id).trim() : "";
  return s || null;
}

type PortalAngebot = {
  id: string;
  titel?: string | null;
  objekt?: PortalObjekt | null;
  linkedLead?: PortalAnfrageLeadSource | null;
  status_einfach?: string | null;
  status?: string | null;
  lead_id?: string | null;
  angebotsnr?: string | null;
  gesamtBrutto?: number;
  positionenDisplay?: PortalAngebotPositionDisplay[];
  created_at?: string | null;
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
  pdf_url?: string | null;
  dokumente?: PortalDokument[];
  /** D11: angebote.herkunft */
  herkunft?: string | null;
};

type PortalAuftrag = {
  id: string;
  titel: string;
  lead_id?: string | null;
  angebot_id?: string | null;
  linkedLead?: PortalAnfrageLeadSource | null;
  ansprechpartner?: PortalAnsprechpartner;
  /** Zugewiesene Partner-Firma(n) für Ausführung · Handwerker. */
  handwerkerLabel?: string | null;
  objekt?: PortalObjekt | null;
  status?: string | null;
  fortschritt?: number | null;
  start_datum?: string | null;
  end_datum?: string | null;
  created_at?: string | null;
  bautagebuch?: PortalBautagebuchEntry[];
  dokumente?: PortalDokument[];
  abnahmeProtokolle?: Array<{
    punkte?: unknown;
    maengel?: unknown;
    freigabe_status?: string | null;
  }>;
  positionen?: KundeAuftragPositionInput[];
  angebotPositionenRaw?: unknown;
  terminSlots?: PortalTerminSlot[];
  rechnungen?: Array<{
    id: string;
    status?: string | null;
    faellig?: string | null;
    faellig_am?: string | null;
    rechnungsdatum?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    gesendet_at?: string | null;
    brutto?: number | null;
    rechnung_art?: string | null;
    abschlag_index?: number | null;
    bezahlt_at?: string | null;
  }>;
};

function filterVorgangDokumente(
  docs: PortalDokument[],
  opts: {
    hvMieterView?: boolean;
    eigentuemerView?: boolean;
    erledigt?: boolean;
  }
): PortalDokument[] {
  const viewer = opts.hvMieterView
    ? "mieter"
    : opts.eigentuemerView
      ? "eigentuemer"
      : "kunde";
  return filterPortalDokumenteForViewer(docs, {
    viewer,
    erledigt: opts.erledigt,
  });
}

function resolveVorgangStatusForLead(
  lead: PortalLead,
  angebot: PortalAngebot | null,
  auftrag: PortalAuftrag | null,
  opts: {
    mieterStatusMode?: boolean;
    hvPortalMode?: boolean;
    hasPendingAuftragAenderung?: boolean;
  }
) {
  const hidePreise = isHvPortalLead(lead);
  const useLegacyHvMieter = Boolean(opts.mieterStatusMode && hidePreise);
  const portalRole = resolvePortalBuildRole({
    mieterStatusMode: useLegacyHvMieter,
    hvPortalMode: opts.hvPortalMode,
  });
  const terminSlots = auftrag?.terminSlots ?? [];
  const angebotStatus = angebot?.status_einfach ?? angebot?.status;
  const angebotEntscheidbar = Boolean(
    angebot &&
      !auftrag &&
      isAngebotPortalAnnehmbar({
        status: angebot.status,
        status_einfach: angebot.status_einfach,
        pdf_url: angebot.pdf_url,
        angebotsnr: angebot.angebotsnr,
        gesendet_am: angebot.gesendet_am,
        gesendet_kunde_at: angebot.gesendet_kunde_at,
      })
  );
  const legacy = resolveKundeVorgangStatus({
    leadStatus: lead.status,
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    org_freigabe_status: lead.org_freigabe_status,
    angebotStatus,
    angebotEntscheidbar,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    hasAngebotRecord: Boolean(angebot),
    hasAuftragRecord: Boolean(auftrag),
    hasPendingAuftragAenderung: opts.hasPendingAuftragAenderung,
    useHvMieterStatus: useLegacyHvMieter,
    hasMieterTermin: hasMieterTerminPhase(terminSlots),
    hasOffeneTerminvorschlaege: hasOffeneTerminvorschlaege(terminSlots),
    auftragPositionen: auftrag?.positionen,
  });

  return resolvePortalKundeVorgangStatus({
    lead: {
      id: lead.id,
      status: lead.status,
      situation: lead.situation,
      funnel_daten: lead.funnel_daten,
      kanal: lead.kanal,
      kontakt_name: lead.kontakt_name,
      org_freigabe_status: lead.org_freigabe_status,
      hv_meldung_status: lead.hv_meldung_status,
      plz: lead.plz,
      bereiche: lead.bereiche,
      created_at: lead.created_at,
    },
    angebot: angebot
      ? {
          id: angebot.id,
          status: angebot.status,
          status_einfach: angebot.status_einfach,
          created_at: angebot.created_at,
        }
      : null,
    auftrag: auftrag
      ? {
          id: auftrag.id,
          status: auftrag.status,
          created_at: auftrag.created_at,
          positionen: auftrag.positionen,
        }
      : null,
    rechnungen: auftrag?.rechnungen ?? [],
    role: portalRole,
    useLegacyHvMieter,
    legacy,
  });
}

function formatAnfrageGewerk(bereiche?: string[] | null): string | undefined {
  const parts = (bereiche ?? [])
    .map((b) => labelBereich(String(b).trim()))
    .filter((l) => l && l !== "—");
  return parts.length ? parts.join(", ") : undefined;
}

function anfrageTitleFromLead(
  lead: Pick<
    PortalLead,
    | "situation"
    | "bereiche"
    | "anlass"
    | "kanal"
    | "funnel_daten"
    | "kontakt_nachricht"
    | "erfassung_von"
  > & { notizen?: string | null }
): {
  title: string;
  anfrageVorhaben?: string;
  anfrageGewerk?: string;
} {
  const vorhabenLabel = labelSituation(lead.situation);
  const gewerk = formatAnfrageGewerk(lead.bereiche);
  const vorhaben = vorhabenLabel !== "—" ? vorhabenLabel : undefined;

  if (
    leadIstMeldeTitelQuelle({
      anlass: lead.anlass,
      kanal: lead.kanal,
      funnelDaten: lead.funnel_daten,
      erfassung_von: lead.erfassung_von,
    })
  ) {
    const title = buildMeldeVorgangTitel({
      situation: lead.situation,
      bereiche: lead.bereiche,
      funnelDaten: lead.funnel_daten,
      beschreibung:
        lead.kontakt_nachricht ??
        (lead as { notizen?: string | null }).notizen ??
        null,
    });
    return { title, anfrageVorhaben: vorhaben, anfrageGewerk: gewerk };
  }

  /** HV-selbst / normale Anfrage: Situation · Gewerk — nie „Meldung“. */
  const fromFunnel = titelFromFunnelLeistungen(lead.funnel_daten);
  const title =
    [vorhaben, gewerk].filter(Boolean).join(" · ") ||
    fromFunnel ||
    "Vorgang";
  return { title, anfrageVorhaben: vorhaben, anfrageGewerk: gewerk };
}

/** CRM-Angebotstitel nur nutzen, wenn er echt sprechend ist (nicht Name/Kategorie). */
function isUsableAngebotTitel(
  angebotTitel: string,
  lead: PortalLead
): boolean {
  const t = angebotTitel.trim();
  if (!t) return false;
  if (/^(notfall|reparatur|schaden|sonstiges|meldung|vorgang)\b/i.test(t)) {
    return false;
  }
  if (/^(notfall|reparatur|schaden|sonstiges)\s*[·|—-]/i.test(t)) {
    return false;
  }
  const melder = (lead.melder_name ?? lead.kontakt_name ?? "").trim();
  if (melder && t.toLowerCase() === melder.toLowerCase()) return false;
  // Kurzer Buchstabensalat ohne Leerzeichen (Tippfehler-Namen als Titel)
  if (t.length <= 24 && !/\s/.test(t) && !/[.,;:!?/]/.test(t)) {
    return false;
  }
  return true;
}

/**
 * Einheitlicher Vorgangs-Titel für Startseite · Liste · Detail.
 * Melde-Vorgänge: immer sprechender Melde-Titel (z. B. „Wasser am Heizkörper“).
 */
function resolveListCardTitle(
  lead: PortalLead,
  angebot: PortalAngebot | null
): string {
  const meldeQuelle = leadIstMeldeTitelQuelle({
    anlass: lead.anlass,
    kanal: lead.kanal,
    funnelDaten: lead.funnel_daten,
    erfassung_von: lead.erfassung_von,
  });
  if (meldeQuelle) {
    return anfrageTitleFromLead(lead).title;
  }
  const angebotTitel = sanitizeCustomerText(angebot?.titel, 200)?.trim();
  if (angebotTitel && isUsableAngebotTitel(angebotTitel, lead)) {
    return angebotTitel;
  }
  return anfrageTitleFromLead(lead).title;
}

function buildItemFromLead(
  lead: PortalLead,
  angebot: PortalAngebot | null,
  auftrag: PortalAuftrag | null,
  vorgangStatus: ReturnType<typeof resolvePortalKundeVorgangStatus>,
  mieterStatusMode?: boolean,
  mieterFeedbackByLeadId?: Map<
    string,
    { sterne: number; freitext?: string | null }
  >,
  eigentuemerView?: boolean
): KundePortalDetailItem {
  const { anfrageVorhaben, anfrageGewerk } = anfrageTitleFromLead(lead);
  const title = resolveListCardTitle(lead, angebot);
  const addr = resolveAnfrageAdresse(lead);
  const melder = resolveAnfrageMelder(lead);
  const hidePreise = Boolean(mieterStatusMode && isHvPortalLead(lead));
  const hvMieterView = Boolean(mieterStatusMode && isHvPortalLead(lead));
  const melderStatusUrl = resolveMelderStatusUrl(lead);
  const meldeStrasse = addr.strasseZeile || null;
  const meldePlz = addr.plz || null;
  const meldeOrt = addr.ort || null;
  const norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche);
  const situationSlug = norm.situation || lead.situation || undefined;
  const situationLabel =
    situationSlug && labelSituation(situationSlug) !== "—"
      ? labelSituation(situationSlug)
      : null;
  const meldeBereich =
    (lead.bereiche ?? norm.bereiche ?? [])
      .map((b) => labelBereich(b))
      .filter((b) => b && b !== "—")
      .join(", ") || null;
  const meldeFotos = meldeFotosFromFunnel(lead.funnel_daten);
  const detailKontext = {
    coverUrl:
      lead.objekt?.cover_url?.trim() ||
      auftrag?.objekt?.cover_url?.trim() ||
      angebot?.objekt?.cover_url?.trim() ||
      null,
    melderName: melder.name ?? lead.kontakt_name ?? null,
    melderEinheit: melder.einheit ?? null,
    melderTelefon: melder.telefon ?? null,
    melderEmail: melder.email ?? null,
    kostentraeger: lead.kostentraeger ?? null,
    kostentraegerVorgeschlagen: Boolean(lead.kostentraeger_vorgeschlagen),
    versicherungsNr: lead.versicherungs_nr ?? null,
    schadenNr: lead.schaden_nr ?? null,
    versicherungsaktePdfUrl: lead.versicherungsakte_pdf_url ?? null,
    versicherungsakteErstelltAm: lead.versicherungsakte_erstellt_am ?? null,
    schadenNrGeaendertAm: lead.schaden_nr_geaendert_am ?? null,
    versicherungsNrGeaendertAm: lead.versicherungs_nr_geaendert_am ?? null,
    objektVersicherungsNr:
      (lead.objekt as { versicherungs_nr?: string | null } | null | undefined)
        ?.versicherungs_nr ?? null,
    meldeFotos,
    orgFreigabeStatus: lead.org_freigabe_status ?? null,
    freigabeBypassGrund: lead.freigabe_bypass_grund ?? null,
    funnelDirektauftrag:
      lead.funnel_daten &&
      typeof lead.funnel_daten === "object" &&
      !Array.isArray(lead.funnel_daten) &&
      (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag === true
        ? true
        : false,
    hvMeldungStatus: lead.hv_meldung_status ?? null,
    kundeObjektId:
      (lead.kunde_objekt_id != null
        ? String(lead.kunde_objekt_id).trim()
        : "") ||
      (lead.objekt &&
      typeof lead.objekt === "object" &&
      "id" in lead.objekt &&
      lead.objekt.id != null
        ? String(lead.objekt.id).trim()
        : "") ||
      null,
    meldeStrasse,
    meldeHausnummer: addr.hausnummer || null,
    meldePlz,
    meldeOrt,
    meldeSituation: situationLabel,
    meldeBereich,
    meldeZeitraum: formatAnfrageZeitraum(lead) ?? null,
    meldeFachdetails: fachdetailRowsFromFunnelDaten(
      lead.funnel_daten,
      lead.bereiche
    ),
    meldeFachdetailAnswers:
      norm.fachdetails.fachdetailAnswers ?? undefined,
    meldeUrsachenCheck: parseMeldeUrsachenCheck(lead.funnel_daten),
    meldePreisIndikation: meldePreisIndikationFromLead(lead, hvMieterView),
  };
  const leadId = lead.id;
  const feedbackBereit = vorgangFeedbackBereit({
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    positionen: auftrag?.positionen,
  });
  const mieterFeedback = mieterFeedbackByLeadId?.get(leadId) ?? null;
  const cardSubtitle =
    formatMockVorgangListSubtitle(lead) ||
    formatAnfrageStrasseHausnummer(lead) ||
    undefined;

  const wartetAufHw =
    !hvMieterView && !eigentuemerView
      ? resolveHvWartetAufHw({
          positionen: auftrag?.positionen,
          hwAngebotAusstehend:
            String(lead.hv_meldung_status ?? "").toLowerCase() ===
            "angebot_eingefordert",
        })
      : null;
  const wartetAufHwLabel = wartetAufHw?.label ?? null;

  const filterDocs = (docs: PortalDokument[]) =>
    excludeMeldeFunnelFotosFromDokumente(
      filterVorgangDokumente(docs, {
        /** Dokumente: Mieter bei HV-Lead — nur Abnahme. */
        hvMieterView,
        eigentuemerView,
        erledigt: vorgangStatus.phase === "abgeschlossen",
      }),
      meldeFotos
    );

  if (auftrag) {
    const leadSource: PortalAnfrageLeadSource = {
      ...lead,
      objekt: lead.objekt ?? auftrag.objekt ?? null,
    };
    const auftragPositionen = buildKundeAuftragPositionenDisplay(
      auftrag.positionen ?? [],
      auftrag.angebotPositionenRaw
    );
    const auftragGesamtBrutto = resolveKundeAuftragGesamtBrutto(auftragPositionen);
    const pendingAenderung = hatOffeneKundeAuftragAenderung(auftrag.positionen);
    const abnahmeCheckliste: PortalAbnahmeCheckliste | null =
      buildPortalAbnahmeCheckliste(auftrag.abnahmeProtokolle ?? []);
    return {
      id: auftrag.id,
      leadId: lead.id,
      date: auftrag.start_datum || auftrag.created_at || lead.created_at || undefined,
      auftragEndDatum: auftrag.end_datum ?? undefined,
      title,
      cardSubtitle: formatMockVorgangListSubtitle(leadSource) ?? cardSubtitle,
      cardMeta: buildAuftragCardMeta(
        auftrag.objekt ?? lead.objekt,
        leadSource,
        auftrag.start_datum || auftrag.created_at,
        auftrag.end_datum
      ),
      isAuftragDetail: true,
      suppressLocationInHero: true,
      status: vorgangStatus.label,
      statusPillKey: vorgangStatus.pillKey,
      sections: buildAuftragPortalSections({ lead: leadSource, objekt: auftrag.objekt }),
      ansprechpartner: auftrag.ansprechpartner ?? portalAnsprechpartnerFallback(),
      handwerkerName: auftrag.handwerkerLabel?.trim() || null,
      dokumente: filterDocs(
        collectVorgangDokumente({
          leadDocs: lead.dokumente,
          angebotDocs: angebot?.dokumente,
          auftragDocs: auftrag.dokumente,
        })
      ),
      bautagebuch: auftrag.bautagebuch ?? [],
      auftragPositionen: hvMieterView ? undefined : auftragPositionen,
      abnahmeCheckliste: hvMieterView ? undefined : abnahmeCheckliste,
      gesamtBrutto: hvMieterView ? undefined : auftragGesamtBrutto,
      rechnungen: hvMieterView ? undefined : auftrag.rechnungen ?? [],
      hidePreise,
      hvMieterView,
      terminAuftragId: auftrag.id,
      terminSlots: auftrag.terminSlots ?? [],
      infoHint: eigentuemerView
        ? undefined
        : !hvMieterView && pendingAenderung
          ? "Leistungsänderungen prüfen und annehmen."
          : undefined,
      vorgangPhase: vorgangStatus.phase,
      needsAction: eigentuemerView ? false : vorgangStatus.needsAction,
      actionHint: eigentuemerView
        ? undefined
        : vorgangStatus.resolverActionHint ?? undefined,
      feedbackBereit,
      mieterFeedback,
      melderStatusUrl: hvMieterView ? undefined : melderStatusUrl,
      wartetAufHwLabel,
      ...detailKontext,
    };
  }

  if (angebot) {
    const leadSource: PortalAnfrageLeadSource = {
      ...lead,
      objekt: lead.objekt ?? angebot.objekt ?? null,
    };
    return {
      id: angebot.id,
      leadId: lead.id,
      date: angebot.created_at ?? lead.created_at ?? undefined,
      title,
      cardSubtitle: formatMockVorgangListSubtitle(leadSource) ?? cardSubtitle,
      cardMeta: buildAngebotCardMeta(leadSource, angebot.created_at),
      isAngebotDetail: true,
      angebotPositionen: hvMieterView ? undefined : angebot.positionenDisplay,
      gesamtBrutto: hvMieterView ? undefined : angebot.gesamtBrutto,
      angebotHerkunft: angebot.herkunft ?? null,
      hidePreise,
      hvMieterView,
      suppressLocationInHero: true,
      status: vorgangStatus.label,
      statusPillKey: vorgangStatus.pillKey,
      sections: buildAngebotPortalSections({ lead: leadSource, objekt: angebot.objekt }),
      dokumente: filterDocs(
        collectVorgangDokumente({
          leadDocs: lead.dokumente,
          angebotDocs: angebot.dokumente,
        })
      ),
      infoHint: undefined,
      vorgangPhase: vorgangStatus.phase,
      needsAction: eigentuemerView ? false : vorgangStatus.needsAction,
      actionHint: eigentuemerView
        ? undefined
        : vorgangStatus.resolverActionHint ?? undefined,
      feedbackBereit,
      mieterFeedback,
      melderStatusUrl: hvMieterView ? undefined : melderStatusUrl,
      wartetAufHwLabel,
      ...detailKontext,
    };
  }

  return {
    id: lead.id,
    leadId: lead.id,
    date: lead.created_at ?? undefined,
    title,
    anfrageGewerk,
    anfrageVorhaben,
    plz: addr.plz,
    ort: addr.ort,
    cardSubtitle,
    cardMeta: buildAnfrageCardMeta(lead),
    status: vorgangStatus.label,
    statusPillKey: vorgangStatus.pillKey,
    sections: buildAnfragePortalSections(lead),
    dokumente: filterDocs(
      collectVorgangDokumente({
        leadDocs: lead.dokumente,
      })
    ),
    vorgangPhase: vorgangStatus.phase,
    needsAction: eigentuemerView ? false : vorgangStatus.needsAction,
    actionHint: eigentuemerView
      ? undefined
      : vorgangStatus.resolverActionHint ?? undefined,
    hidePreise,
    hvMieterView,
    feedbackBereit,
    mieterFeedback,
    melderStatusUrl: hvMieterView ? undefined : melderStatusUrl,
    wartetAufHwLabel,
    ...detailKontext,
  };
}

function resolveAuftragForLead(
  leadId: string,
  angebot: PortalAngebot | null,
  auftragByLead: Map<string, PortalAuftrag>,
  auftragByAngebot: Map<string, PortalAuftrag>
): PortalAuftrag | null {
  const byLead = auftragByLead.get(leadId);
  if (byLead) return byLead;
  const angebotId = normPortalId(angebot?.id);
  if (angebotId) {
    const byAngebot = auftragByAngebot.get(angebotId);
    if (byAngebot) return byAngebot;
  }
  return null;
}

/** Bevorzugtes Angebot pro Lead (aktive vor Entwurf/ersetzt, dann neueste). */
function pickPreferredAngebot(candidates: PortalAngebot[]): PortalAngebot {
  const rank = (a: PortalAngebot): number => {
    const s = String(a.status_einfach ?? a.status ?? "")
      .toLowerCase()
      .trim();
    if (s === "angenommen" || s === "beauftragt" || s === "kunde_akzeptiert") {
      return 0;
    }
    if (s === "gesendet") return 1;
    if (s === "entwurf") return 3;
    if (s === "ersetzt" || s === "abgelehnt" || s === "abgelaufen") return 9;
    return 5;
  };
  return [...candidates].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  })[0]!;
}

export function buildKundeVorgaenge(input: {
  leads: PortalLead[];
  angebote: PortalAngebot[];
  auftraege: PortalAuftrag[];
  /** Hausverwaltungs-Portal: CRM-Resolver mit role „hv“. */
  hvPortalMode?: boolean;
  /** MeinBärenwald: HV-Mieter sehen vereinfachte Status (Offen / In Bearbeitung / Termin / Erledigt). */
  mieterStatusMode?: boolean;
  /** Eigentümer: Dokumente ohne Rechnung. */
  eigentuemerMode?: boolean;
  mieterFeedbackByLeadId?: Record<
    string,
    { sterne: number; freitext?: string | null }
  >;
}): KundePortalDetailItem[] {
  const angeboteByLeadId = new Map<string, PortalAngebot[]>();
  for (const a of input.angebote) {
    if (!isAngebotPortalSichtbar(a)) continue;
    const leadId = normPortalId(a.lead_id);
    if (!leadId) continue;
    const list = angeboteByLeadId.get(leadId) ?? [];
    list.push(a);
    angeboteByLeadId.set(leadId, list);
  }

  const angebotByLead = new Map<string, PortalAngebot>();
  for (const [leadId, list] of Array.from(angeboteByLeadId.entries())) {
    if (!list.length) continue;
    angebotByLead.set(leadId, pickPreferredAngebot(list));
  }

  const auftragByLead = new Map<string, PortalAuftrag>();
  const auftragByAngebot = new Map<string, PortalAuftrag>();
  for (const a of input.auftraege) {
    const leadId = normPortalId(a.lead_id);
    if (leadId) auftragByLead.set(leadId, a);
    const angebotId = normPortalId(a.angebot_id);
    if (angebotId) auftragByAngebot.set(angebotId, a);
  }

  const usedAngebotIds = new Set<string>();
  const usedAuftragIds = new Set<string>();
  const usedLeadIds = new Set<string>();
  const items: KundePortalDetailItem[] = [];
  const feedbackMap = new Map(
    Object.entries(input.mieterFeedbackByLeadId ?? {})
  );
  const eigentuemerView = Boolean(input.eigentuemerMode);

  for (const lead of input.leads) {
    const leadId = normPortalId(lead.id);
    if (!leadId) continue;
    if (
      !isLeadPortalListbar(lead, {
        angebote: input.angebote,
        auftraege: input.auftraege,
      })
    ) {
      continue;
    }
    usedLeadIds.add(leadId);

    const angebot = angebotByLead.get(leadId) ?? null;
    const auftrag = resolveAuftragForLead(
      leadId,
      angebot,
      auftragByLead,
      auftragByAngebot
    );

    // Alle Angebote/Aufträge zu diesem Lead zählen als „bereits dargestellt“
    for (const a of angeboteByLeadId.get(leadId) ?? []) {
      usedAngebotIds.add(a.id);
    }
    if (angebot) usedAngebotIds.add(angebot.id);
    if (auftrag) usedAuftragIds.add(auftrag.id);
    const auftragViaLead = auftragByLead.get(leadId);
    if (auftragViaLead) usedAuftragIds.add(auftragViaLead.id);

    const vorgangStatus = resolveVorgangStatusForLead(lead, angebot, auftrag, {
      mieterStatusMode: input.mieterStatusMode,
      hvPortalMode: input.hvPortalMode,
      hasPendingAuftragAenderung: auftrag
        ? hatOffeneKundeAuftragAenderung(auftrag.positionen)
        : false,
    });

    items.push(
      buildItemFromLead(
        lead,
        angebot,
        auftrag,
        vorgangStatus,
        input.mieterStatusMode,
        feedbackMap,
        eigentuemerView
      )
    );
  }

  for (const angebot of input.angebote) {
    if (usedAngebotIds.has(angebot.id)) continue;
    const linkedLeadId = normPortalId(angebot.lead_id);
    // Lead bereits als Vorgang dargestellt → kein zweites Angebot-Kartending
    if (linkedLeadId && usedLeadIds.has(linkedLeadId)) continue;

    const lead = angebot.linkedLead as PortalLead | null;
    const pseudoLead: PortalLead = {
      id: `angebot-only-${angebot.id}`,
      situation: lead?.situation,
      bereiche: lead?.bereiche,
      created_at: angebot.created_at,
      status: "angebot",
      objekt: angebot.objekt,
      plz: lead?.plz,
      ...lead,
    };
    usedAngebotIds.add(angebot.id);
    const vorgangStatus = resolveVorgangStatusForLead(pseudoLead, angebot, null, {
      mieterStatusMode: input.mieterStatusMode,
      hvPortalMode: input.hvPortalMode,
    });
    items.push(
      buildItemFromLead(
        pseudoLead,
        angebot,
        null,
        vorgangStatus,
        input.mieterStatusMode,
        feedbackMap,
        eigentuemerView
      )
    );
  }

  for (const auftrag of input.auftraege) {
    if (usedAuftragIds.has(auftrag.id)) continue;
    const linkedLeadId = normPortalId(auftrag.lead_id);
    // HV: Aufträge ohne Lead (z. B. nach CRM-Löschung + SET NULL) nicht als Geister-Vorgang zeigen.
    if (input.hvPortalMode && !linkedLeadId) continue;
    if (linkedLeadId && usedLeadIds.has(linkedLeadId)) continue;
    const linkedAngebotId = normPortalId(auftrag.angebot_id);
    if (linkedAngebotId && usedAngebotIds.has(linkedAngebotId)) continue;

    const lead = auftrag.linkedLead as PortalLead | null;
    const pseudoLead: PortalLead = {
      id: `auftrag-only-${auftrag.id}`,
      situation: lead?.situation,
      bereiche: lead?.bereiche,
      created_at: auftrag.created_at,
      status: auftrag.status,
      objekt: auftrag.objekt,
      plz: lead?.plz,
      ...lead,
    };
    usedAuftragIds.add(auftrag.id);
    const vorgangStatus = resolveVorgangStatusForLead(pseudoLead, null, auftrag, {
      mieterStatusMode: input.mieterStatusMode,
      hvPortalMode: input.hvPortalMode,
      hasPendingAuftragAenderung: hatOffeneKundeAuftragAenderung(
        auftrag.positionen
      ),
    });
    items.push(
      buildItemFromLead(
        pseudoLead,
        null,
        auftrag,
        vorgangStatus,
        input.mieterStatusMode,
        feedbackMap,
        eigentuemerView
      )
    );
  }

  return items.sort((a, b) => {
    const pa = a.needsAction ? 0 : a.vorgangPhase === "abgeschlossen" ? 2 : 1;
    const pb = b.needsAction ? 0 : b.vorgangPhase === "abgeschlossen" ? 2 : 1;
    if (pa !== pb) return pa - pb;
    const ta = a.date ? new Date(a.date).getTime() : 0;
    const tb = b.date ? new Date(b.date).getTime() : 0;
    return tb - ta;
  });
}
