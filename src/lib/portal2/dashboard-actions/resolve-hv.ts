import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import {
  hvFreigabeEntfaellt,
  resolveAngebotZugestelltForHvFreigabe,
} from "@/lib/org/freigabe-bypass";
import {
  isInOrgFreigabeQueue,
  leadHasOrgAuftrag,
} from "@/lib/org/org-freigabe-queue";
import { isOrgFreigabeOffen } from "@/lib/org/org-freigabe-status";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { HV_ANGEBOT_ACTIONS } from "@/lib/portal2/hv-liste";
import {
  isPortalAngebotVorgelegt,
  type HvDashboardAngebotSlice,
} from "@/lib/portal2/hv-dashboard";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import {
  leadSortTs,
  sortDashboardActionSlides,
} from "@/lib/portal2/dashboard-actions/sort";

function itemForLead(
  items: KundePortalDetailItem[],
  leadId: string
): KundePortalDetailItem | undefined {
  return items.find((i) => i.leadId === leadId || i.id === leadId);
}

function angebotForLead(
  angebote: HvDashboardAngebotSlice[],
  leadId: string
): HvDashboardAngebotSlice | undefined {
  return angebote.find((a) => String(a.lead_id ?? "") === leadId);
}

function buildAuftragMap(
  auftraege: Array<{ id: string; lead_id?: string | null }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of auftraege) {
    const lid = a.lead_id?.trim();
    if (lid) map[lid] = String(a.id);
  }
  return map;
}

function resolveHvMeldungSlide(input: {
  lead: OrganisationLead;
  item?: KundePortalDetailItem;
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  auftragByLeadId: Record<string, string>;
  hmDelegierbarByObjektId?: Record<string, boolean>;
}): PortalDashboardActionSlide | null {
  const { lead, item, kunde, objekte, auftragByLeadId } = input;
  if (lead.einladung_status === "offen") return null;
  if (isHvDirektauftragInfoOnly(lead, kunde, objekte)) return null;
  if (leadHasOrgAuftrag(lead.id, auftragByLeadId)) return null;

  const status = (lead.hv_meldung_status ?? "neu").trim().toLowerCase();
  if (status !== "neu") return null;
  if (!isInOrgFreigabeQueue(lead, auftragByLeadId)) return null;

  const objektId = lead.kunde_objekt_id?.trim() ?? "";
  const hasHm = objektId
    ? input.hmDelegierbarByObjektId?.[objektId] === true
    : false;

  const buttons: PortalDashboardActionSlide["buttons"] = [
    { id: "ablehnen", label: "Ablehnen", variant: "danger", mode: "inline" },
  ];
  if (hasHm) {
    buttons.push({
      id: "hm_begutachten",
      label: "Hausmeister",
      variant: "secondary",
      mode: "inline",
    });
  }
  buttons.push({
    id: "direkt_baerenwald",
    label: "Direkt Bärenwald",
    variant: "primary",
    mode: "inline",
  });

  return {
    openId: lead.id,
    leadId: lead.id,
    kicker: "Neue Meldung",
    kickerTone: "sand",
    title: item?.title?.trim() || "Vorgang",
    subtitle: item?.cardSubtitle?.trim() || undefined,
    sortTs: leadSortTs(lead),
    kind: "hv_meldung",
    buttons,
    payload: { leadId: lead.id },
  };
}

function resolveHvAngebotFreigabeSlide(input: {
  lead: OrganisationLead;
  item?: KundePortalDetailItem;
  angebot?: HvDashboardAngebotSlice;
  auftragByLeadId: Record<string, string>;
}): PortalDashboardActionSlide | null {
  const { lead, item, angebot, auftragByLeadId } = input;
  if (leadHasOrgAuftrag(lead.id, auftragByLeadId)) return null;
  if (!isOrgFreigabeOffen(lead.org_freigabe_status)) return null;

  const angebotZugestellt = resolveAngebotZugestelltForHvFreigabe({
    orgFreigabeStatus: lead.org_freigabe_status,
    bypassGrund: lead.freigabe_bypass_grund,
    hasAngebot: Boolean(angebot && isPortalAngebotVorgelegt(angebot)),
  });

  if (
    hvFreigabeEntfaellt({
      orgFreigabeStatus: lead.org_freigabe_status,
      bypassGrund: lead.freigabe_bypass_grund,
      funnelDirektauftrag: false,
      hvMeldungStatus: lead.hv_meldung_status,
      angebotZugestellt,
    })
  ) {
    return null;
  }

  if (!angebotZugestellt) return null;

  const freigabeStatus = (lead.org_freigabe_status ?? "").trim();
  const kicker =
    freigabeStatus === "beschluss_ausstehend"
      ? "Wartet auf Beschluss"
      : "Angebot zur Freigabe";

  return {
    openId: lead.id,
    leadId: lead.id,
    kicker,
    kickerTone: "sand",
    title: item?.title?.trim() || "Vorgang",
    subtitle: item?.cardSubtitle?.trim() || undefined,
    sortTs: leadSortTs(lead),
    kind: "hv_angebot_freigabe",
    buttons: HV_ANGEBOT_ACTIONS.map((a) => ({
      id: a.id,
      label: a.label,
      variant: a.variant === "danger" ? "danger" : "primary",
      mode: "inline" as const,
    })),
    payload: { leadId: lead.id },
  };
}

/** HV-Verwaltung — echte Aktionen (Meldung / Angebots-Freigabe). */
export function resolveHvDashboardActions(input: {
  leads: OrganisationLead[];
  eingang: OrganisationLead[];
  items: KundePortalDetailItem[];
  angebote: HvDashboardAngebotSlice[];
  auftraege: Array<{ id: string; lead_id?: string | null }>;
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  hmDelegierbarByObjektId?: Record<string, boolean>;
}): PortalDashboardActionSlide[] {
  const auftragByLeadId = buildAuftragMap(input.auftraege);
  const byId = new Map<string, OrganisationLead>();
  for (const l of [...input.leads, ...input.eingang]) {
    if (l?.id) byId.set(l.id, l);
  }

  const slides: PortalDashboardActionSlide[] = [];

  for (const lead of byId.values()) {
    const item = itemForLead(input.items, lead.id);
    const angebot = angebotForLead(input.angebote, lead.id);

    const freigabe = resolveHvAngebotFreigabeSlide({
      lead,
      item,
      angebot,
      auftragByLeadId,
    });
    if (freigabe) {
      slides.push(freigabe);
      continue;
    }

    const meldung = resolveHvMeldungSlide({
      lead,
      item,
      kunde: input.kunde,
      objekte: input.objekte,
      auftragByLeadId,
      hmDelegierbarByObjektId: input.hmDelegierbarByObjektId,
    });
    if (meldung) slides.push(meldung);
  }

  return sortDashboardActionSlides(slides);
}
