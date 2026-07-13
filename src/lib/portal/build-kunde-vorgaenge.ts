import {
  buildAnfrageCardMeta,
  buildAnfragePortalSections,
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
import {
  filterPortalDokumenteForViewer,
} from "@/lib/portal/portal-dokumente";
import {
  type KundePortalDetailItem,
  type PortalBautagebuchEntry,
  objektPlzOrt,
} from "@/lib/portal/portal-detail-item";
import { sanitizeCustomerText } from "@/lib/portal/portal-display";
import { vorgangFeedbackBereit } from "@/lib/portal/vorgang-feedback-eligibility";
import { resolveKundeVorgangStatus } from "@/lib/portal/kunde-vorgang-status";
import { isHvPortalLead } from "@/lib/portal/hv-portal-lead";
import {
  hasMieterTerminPhase,
  hasOffeneTerminvorschlaege,
  type PortalTerminSlot,
} from "@/lib/portal/portal-termin";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";

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
};

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
  dokumente?: PortalDokument[];
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
};

function filterHvMieterDokumente(
  docs: PortalDokument[],
  hvMieterView: boolean,
  erledigt?: boolean
): PortalDokument[] {
  return filterPortalDokumenteForViewer(docs, {
    hvMieterView,
    erledigt,
  });
}

function resolveVorgangStatusForLead(
  lead: PortalLead,
  angebot: PortalAngebot | null,
  auftrag: PortalAuftrag | null,
  opts: {
    mieterStatusMode?: boolean;
    hasPendingAuftragAenderung?: boolean;
  }
) {
  const hidePreise = isHvPortalLead(lead);
  const terminSlots = auftrag?.terminSlots ?? [];
  return resolveKundeVorgangStatus({
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
    useHvMieterStatus: Boolean(opts.mieterStatusMode && hidePreise),
    hasMieterTermin: hasMieterTerminPhase(terminSlots),
    hasOffeneTerminvorschlaege: hasOffeneTerminvorschlaege(terminSlots),
    auftragPositionen: auftrag?.positionen,
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
  const title = [vorhaben, gewerk].filter(Boolean).join(" · ") || "Vorgang";
  return { title, anfrageVorhaben: vorhaben, anfrageGewerk: gewerk };
}

function buildItemFromLead(
  lead: PortalLead,
  angebot: PortalAngebot | null,
  auftrag: PortalAuftrag | null,
  vorgangStatus: ReturnType<typeof resolveKundeVorgangStatus>,
  mieterStatusMode?: boolean,
  mieterFeedbackByLeadId?: Map<
    string,
    { sterne: number; freitext?: string | null }
  >
): KundePortalDetailItem {
  const { title, anfrageVorhaben, anfrageGewerk } = anfrageTitleFromLead(lead);
  const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
  const hidePreise = isHvPortalLead(lead);
  const hvMieterView = Boolean(mieterStatusMode && hidePreise);
  const leadId = lead.id;
  const feedbackBereit = vorgangFeedbackBereit({
    leadVorgangPhase: lead.vorgang_phase,
    hv_meldung_status: lead.hv_meldung_status,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    positionen: auftrag?.positionen,
  });
  const mieterFeedback = mieterFeedbackByLeadId?.get(leadId) ?? null;

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
      title: auftrag.titel || title,
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
      dokumente: filterHvMieterDokumente(
        auftrag.dokumente ?? lead.dokumente ?? [],
        hvMieterView,
        vorgangStatus.phase === "abgeschlossen"
      ),
      bautagebuch: auftrag.bautagebuch ?? [],
      auftragPositionen: hvMieterView ? undefined : auftragPositionen,
      gesamtBrutto: hidePreise ? undefined : auftragGesamtBrutto,
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
      feedbackBereit,
      mieterFeedback,
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
      title:
        sanitizeCustomerText(angebot.titel, 200) ||
        (angebot.angebotsnr ? `Angebot ${angebot.angebotsnr}` : title),
      cardMeta: buildAngebotCardMeta(leadSource, angebot.created_at),
      isAngebotDetail: true,
      angebotPositionen: hvMieterView ? undefined : angebot.positionenDisplay,
      gesamtBrutto: hidePreise ? undefined : angebot.gesamtBrutto,
      hidePreise,
      hvMieterView,
      suppressLocationInHero: true,
      status: vorgangStatus.label,
      statusPillKey: vorgangStatus.pillKey,
      sections: buildAngebotPortalSections({ lead: leadSource, objekt: angebot.objekt }),
      dokumente: filterHvMieterDokumente(
        angebot.dokumente ?? lead.dokumente ?? [],
        hvMieterView,
        vorgangStatus.phase === "abgeschlossen"
      ),
      infoHint:
        !hvMieterView &&
        vorgangStatus.phase === "angebot_wird_erstellt"
          ? "Wir bereiten dein Angebot vor und melden uns, sobald es bereitsteht."
          : undefined,
      vorgangPhase: vorgangStatus.phase,
      needsAction: vorgangStatus.needsAction,
      feedbackBereit,
      mieterFeedback,
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
    cardMeta: buildAnfrageCardMeta(lead),
    status: vorgangStatus.label,
    statusPillKey: vorgangStatus.pillKey,
    sections: buildAnfragePortalSections(lead),
    dokumente: filterHvMieterDokumente(
      lead.dokumente ?? [],
      hvMieterView,
      vorgangStatus.phase === "abgeschlossen"
    ),
    vorgangPhase: vorgangStatus.phase,
    needsAction: vorgangStatus.needsAction,
    hidePreise,
    hvMieterView,
    feedbackBereit,
    mieterFeedback,
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

export function buildKundeVorgaenge(input: {
  leads: PortalLead[];
  angebote: PortalAngebot[];
  auftraege: PortalAuftrag[];
  /** MeinBärenwald: HV-Mieter sehen vereinfachte Status (Offen / In Bearbeitung / Termin / Erledigt). */
  mieterStatusMode?: boolean;
  mieterFeedbackByLeadId?: Record<
    string,
    { sterne: number; freitext?: string | null }
  >;
}): KundePortalDetailItem[] {
  const angebotByLead = new Map<string, PortalAngebot>();
  for (const a of input.angebote) {
    const leadId = normPortalId(a.lead_id);
    if (leadId) angebotByLead.set(leadId, a);
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
  const items: KundePortalDetailItem[] = [];
  const feedbackMap = new Map(
    Object.entries(input.mieterFeedbackByLeadId ?? {})
  );

  for (const lead of input.leads) {
    const leadId = normPortalId(lead.id);
    if (!leadId) continue;
    const angebot = angebotByLead.get(leadId) ?? null;
    const auftrag = resolveAuftragForLead(
      leadId,
      angebot,
      auftragByLead,
      auftragByAngebot
    );
    if (angebot) usedAngebotIds.add(angebot.id);
    if (auftrag) usedAuftragIds.add(auftrag.id);

    const vorgangStatus = resolveVorgangStatusForLead(lead, angebot, auftrag, {
      mieterStatusMode: input.mieterStatusMode,
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
        feedbackMap
      )
    );
  }

  for (const angebot of input.angebote) {
    if (usedAngebotIds.has(angebot.id)) continue;
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
    const vorgangStatus = resolveVorgangStatusForLead(pseudoLead, angebot, null, {
      mieterStatusMode: input.mieterStatusMode,
    });
    items.push(
      buildItemFromLead(
        pseudoLead,
        angebot,
        null,
        vorgangStatus,
        input.mieterStatusMode,
        feedbackMap
      )
    );
  }

  for (const auftrag of input.auftraege) {
    if (usedAuftragIds.has(auftrag.id)) continue;
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
    const vorgangStatus = resolveVorgangStatusForLead(pseudoLead, null, auftrag, {
      mieterStatusMode: input.mieterStatusMode,
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
        feedbackMap
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
