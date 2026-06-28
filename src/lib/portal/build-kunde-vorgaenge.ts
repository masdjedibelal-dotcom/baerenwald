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
  portalAnsprechpartnerFallback,
  type PortalAnsprechpartner,
} from "@/lib/portal/portal-ansprechpartner";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";
import {
  type KundePortalDetailItem,
  type PortalBautagebuchEntry,
  objektPlzOrt,
} from "@/lib/portal/portal-detail-item";
import { fmtPortalAuftragStatus, sanitizeCustomerText } from "@/lib/portal/portal-display";
import { resolveKundeVorgangStatus } from "@/lib/portal/kunde-vorgang-status";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";
import {
  isPortalAuftragAbgeschlossenRecord,
} from "@/lib/portal/portal-pipeline";

type PortalLead = PortalAnfrageLeadSource & {
  id: string;
  situation?: string | null;
  bereiche?: string[] | null;
  created_at?: string | null;
  status?: string | null;
  objekt?: PortalObjekt | null;
  plz?: string | null;
  dokumente?: PortalDokument[];
  anlass?: string | null;
};

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
};

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
  vorgangStatus: ReturnType<typeof resolveKundeVorgangStatus>
): KundePortalDetailItem {
  const { title, anfrageVorhaben, anfrageGewerk } = anfrageTitleFromLead(lead);
  const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);

  if (auftrag) {
    const leadSource: PortalAnfrageLeadSource = {
      ...lead,
      objekt: lead.objekt ?? auftrag.objekt ?? null,
    };
    const abgeschlossen = isPortalAuftragAbgeschlossenRecord({
      status: auftrag.status,
      fortschritt: auftrag.fortschritt,
    });
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
      dokumente: auftrag.dokumente ?? lead.dokumente ?? [],
      bautagebuch: auftrag.bautagebuch ?? [],
      vorgangPhase: vorgangStatus.phase,
      needsAction: vorgangStatus.needsAction,
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
      angebotPositionen: angebot.positionenDisplay,
      gesamtBrutto: angebot.gesamtBrutto,
      suppressLocationInHero: true,
      status: vorgangStatus.label,
      statusPillKey: vorgangStatus.pillKey,
      sections: buildAngebotPortalSections({ lead: leadSource, objekt: angebot.objekt }),
      dokumente: angebot.dokumente ?? lead.dokumente ?? [],
      infoHint:
        vorgangStatus.phase === "angebot_wird_erstellt"
          ? "Wir bereiten dein Angebot vor und melden uns, sobald es bereitsteht."
          : undefined,
      vorgangPhase: vorgangStatus.phase,
      needsAction: vorgangStatus.needsAction,
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
    dokumente: lead.dokumente ?? [],
    vorgangPhase: vorgangStatus.phase,
    needsAction: vorgangStatus.needsAction,
  };
}

export function buildKundeVorgaenge(input: {
  leads: PortalLead[];
  angebote: PortalAngebot[];
  auftraege: PortalAuftrag[];
}): KundePortalDetailItem[] {
  const angebotByLead = new Map<string, PortalAngebot>();
  for (const a of input.angebote) {
    if (a.lead_id) angebotByLead.set(a.lead_id, a);
  }

  const auftragByLead = new Map<string, PortalAuftrag>();
  for (const a of input.auftraege) {
    if (a.lead_id) auftragByLead.set(a.lead_id, a);
  }

  const usedAngebotIds = new Set<string>();
  const usedAuftragIds = new Set<string>();
  const items: KundePortalDetailItem[] = [];

  for (const lead of input.leads) {
    const angebot = angebotByLead.get(lead.id) ?? null;
    const auftrag = auftragByLead.get(lead.id) ?? null;
    if (angebot) usedAngebotIds.add(angebot.id);
    if (auftrag) usedAuftragIds.add(auftrag.id);

    const vorgangStatus = resolveKundeVorgangStatus({
      leadStatus: lead.status,
      angebotStatus: angebot?.status_einfach ?? angebot?.status,
      auftragStatus: auftrag?.status,
      auftragFortschritt: auftrag?.fortschritt,
      hasAngebotRecord: Boolean(angebot),
      hasAuftragRecord: Boolean(auftrag),
    });

    items.push(buildItemFromLead(lead, angebot, auftrag, vorgangStatus));
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
    const vorgangStatus = resolveKundeVorgangStatus({
      leadStatus: "angebot",
      angebotStatus: angebot.status_einfach ?? angebot.status,
      hasAngebotRecord: true,
    });
    items.push(buildItemFromLead(pseudoLead, angebot, null, vorgangStatus));
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
    const vorgangStatus = resolveKundeVorgangStatus({
      leadStatus: auftrag.status,
      auftragStatus: auftrag.status,
      auftragFortschritt: auftrag.fortschritt,
      hasAuftragRecord: true,
    });
    items.push(buildItemFromLead(pseudoLead, null, auftrag, vorgangStatus));
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
