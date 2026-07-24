import { labelSituation, labelZeitraum, labelBereich } from "@/lib/lead-funnel-labels";
import { fachdetailRowsFromFunnelDaten } from "@/lib/lead-funnel-daten";
import {
  buildAnfrageCardMeta,
  buildAnfragePortalSections,
  formatAnfrageStrasseHausnummer,
  formatMockVorgangListSubtitle,
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
import { filterPortalDokumenteForViewer } from "@/lib/portal/portal-dokumente";
import {
  type KundePortalDetailItem,
  type PortalBautagebuchEntry,
  objektPlzOrt,
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

function meldeOrtFromFunnel(funnelDaten: unknown): string | null {
  if (!funnelDaten || typeof funnelDaten !== "object" || Array.isArray(funnelDaten)) {
    return null;
  }
  const ort = (funnelDaten as Record<string, unknown>).ort;
  return typeof ort === "string" && ort.trim() ? ort.trim() : null;
}

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
  hv_meldung_status?: string | null;
  org_freigabe_status?: string | null;
  kontakt_name?: string | null;
  melde_tracking_token?: string | null;
  melder_name?: string | null;
  melder_einheit?: string | null;
  melder_telefon?: string | null;
  melder_email?: string | null;
  kostentraeger?: string | null;
  kostentraeger_vorgeschlagen?: boolean | null;
  versicherungs_nr?: string | null;
  erfassung_von?: string | null;
  funnel_daten?: unknown;
};

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
  objekt?: PortalObjekt | null;
  status?: string | null;
  fortschritt?: number | null;
  start_datum?: string | null;
  end_datum?: string | null;
  created_at?: string | null;
  bautagebuch?: PortalBautagebuchEntry[];
  dokumente?: PortalDokument[];
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
  const legacy = resolveKundeVorgangStatus({
    leadStatus: lead.status,
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    org_freigabe_status: lead.org_freigabe_status,
    angebotStatus: angebot?.status_einfach ?? angebot?.status,
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

function anfrageTitleFromLead(lead: Pick<PortalLead, "situation" | "bereiche">): {
  title: string;
  anfrageVorhaben?: string;
  anfrageGewerk?: string;
} {
  const vorhabenLabel = labelSituation(lead.situation);
  const gewerk = formatAnfrageGewerk(lead.bereiche);
  const vorhaben = vorhabenLabel !== "—" ? vorhabenLabel : undefined;
  /** Fallback ohne CRM-Angebot: Situation · Vorhaben/Gewerk — nie Kunden-/Meldername. */
  const title = [vorhaben, gewerk].filter(Boolean).join(" · ") || "Vorgang";
  return { title, anfrageVorhaben: vorhaben, anfrageGewerk: gewerk };
}

/** Card-Titel: CRM-Angebotstitel, sonst Situation · Vorhaben. */
function resolveListCardTitle(
  lead: PortalLead,
  angebot: PortalAngebot | null
): string {
  const angebotTitel = sanitizeCustomerText(angebot?.titel, 200)?.trim();
  if (angebotTitel) return angebotTitel;
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
  const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
  const hidePreise = Boolean(mieterStatusMode && isHvPortalLead(lead));
  const hvMieterView = Boolean(mieterStatusMode && isHvPortalLead(lead));
  const melderStatusUrl = resolveMelderStatusUrl(lead);
  const meldeStrasse =
    formatAnfrageStrasseHausnummer(lead) ||
    lead.objekt?.strasse?.trim() ||
    null;
  const meldePlz =
    lead.plz?.trim() ||
    lead.objekt?.plz?.trim() ||
    (plz !== "—" ? plz : null) ||
    null;
  const meldeOrt =
    lead.ort?.trim() ||
    lead.objekt?.ort?.trim() ||
    meldeOrtFromFunnel(lead.funnel_daten) ||
    (ort !== "—" ? ort : null) ||
    null;
  const meldeBereich =
    (lead.bereiche ?? [])
      .map((b) => labelBereich(b))
      .filter((b) => b && b !== "—")
      .join(", ") || null;
  const detailKontext = {
    melderName: lead.melder_name ?? lead.kontakt_name ?? null,
    melderEinheit: lead.melder_einheit ?? null,
    melderTelefon: lead.melder_telefon ?? null,
    melderEmail: lead.melder_email ?? null,
    kostentraeger: lead.kostentraeger ?? null,
    kostentraegerVorgeschlagen: Boolean(lead.kostentraeger_vorgeschlagen),
    versicherungsNr: lead.versicherungs_nr ?? null,
    meldeFotos: meldeFotosFromFunnel(lead.funnel_daten),
    orgFreigabeStatus: lead.org_freigabe_status ?? null,
    hvMeldungStatus: lead.hv_meldung_status ?? null,
    meldeStrasse,
    meldeHausnummer: lead.hausnummer?.trim() || null,
    meldePlz,
    meldeOrt,
    meldeSituation: lead.situation
      ? labelSituation(lead.situation)
      : null,
    meldeBereich,
    meldeZeitraum: lead.zeitraum ? labelZeitraum(lead.zeitraum) : null,
    meldeFachdetails: fachdetailRowsFromFunnelDaten(
      lead.funnel_daten,
      lead.bereiche
    ),
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
  const hvListMeta = Boolean(
    lead.melder_name || lead.melder_einheit || lead.hv_meldung_status
  );
  const cardSubtitle = hvListMeta
    ? formatMockVorgangListSubtitle(lead)
    : [
        formatAnfrageStrasseHausnummer(lead),
        anfrageGewerk,
      ]
        .filter(Boolean)
        .join(" · ") || formatMockVorgangListSubtitle(lead);

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
    filterVorgangDokumente(docs, {
      /** Dokumente: Mieter bei HV-Lead — nur Abnahme. */
      hvMieterView,
      eigentuemerView,
      erledigt: vorgangStatus.phase === "abgeschlossen",
    });

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
      dokumente: filterDocs(auftrag.dokumente ?? lead.dokumente ?? []),
      bautagebuch: hvMieterView ? undefined : auftrag.bautagebuch ?? [],
      auftragPositionen: hvMieterView ? undefined : auftragPositionen,
      gesamtBrutto: hvMieterView ? undefined : auftragGesamtBrutto,
      hidePreise,
      hvMieterView,
      terminAuftragId: hvMieterView ? auftrag.id : undefined,
      terminSlots: hvMieterView ? auftrag.terminSlots ?? [] : undefined,
      infoHint:
        hvMieterView && vorgangStatus.needsAction
          ? "Bitte wähle einen Terminvorschlag aus."
          : !hvMieterView && pendingAenderung
            ? "Bärenwald hat Leistungen ergänzt oder angepasst. Bitte prüfe die Änderungen und nimm sie verbindlich an."
            : undefined,
      vorgangPhase: vorgangStatus.phase,
      needsAction: vorgangStatus.needsAction,
      actionHint: vorgangStatus.resolverActionHint ?? undefined,
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
      dokumente: filterDocs(angebot.dokumente ?? lead.dokumente ?? []),
      infoHint:
        !hvMieterView &&
        vorgangStatus.phase === "angebot_liegt_vor" &&
        vorgangStatus.needsAction
          ? "Bitte prüfen Sie das Angebot und nehmen Sie es an — danach wird der Auftrag im CRM angelegt."
          : !hvMieterView &&
              vorgangStatus.phase === "angebot_wird_erstellt"
            ? "Wir bereiten dein Angebot vor und melden uns, sobald es bereitsteht."
            : undefined,
      vorgangPhase: vorgangStatus.phase,
      needsAction: vorgangStatus.needsAction,
      actionHint: vorgangStatus.resolverActionHint ?? undefined,
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
    plz,
    ort,
    cardSubtitle,
    cardMeta: buildAnfrageCardMeta(lead),
    status: vorgangStatus.label,
    statusPillKey: vorgangStatus.pillKey,
    sections: buildAnfragePortalSections(lead),
    dokumente: filterDocs(lead.dokumente ?? []),
    vorgangPhase: vorgangStatus.phase,
    needsAction: vorgangStatus.needsAction,
    actionHint: vorgangStatus.resolverActionHint ?? undefined,
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
    const leadId = normPortalId(a.lead_id);
    if (!leadId) continue;
    const list = angeboteByLeadId.get(leadId) ?? [];
    list.push(a);
    angeboteByLeadId.set(leadId, list);
  }

  const angebotByLead = new Map<string, PortalAngebot>();
  for (const [leadId, list] of Array.from(angeboteByLeadId.entries())) {
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
