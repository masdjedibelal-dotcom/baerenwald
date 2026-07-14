import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import { buildPortalResolveInput } from "@/lib/crm-vorgang/portal-resolve";
import { resolveVorgang } from "@/lib/crm-vorgang/resolve-vorgang";
import { resolveVorgangDisplay } from "@/lib/crm-vorgang/resolve-vorgang-display";
import {
  partnerAuftragListenStatusLabel,
  partnerAuftragListenStatusPillKey,
} from "@/lib/partner/partner-auftrag-list-status";
import {
  vorgangStateLabel,
  vorgangStatePillKey,
  type VorgangState,
} from "@/lib/partner/vorgang-state";

export function resolvePartnerHandwerkerCrmDisplay(
  vorgang: PartnerVorgangItem
): ReturnType<typeof resolveVorgangDisplay> | null {
  const lead = vorgang.auftrag.lead;
  if (!lead) return null;

  const resolved = resolveVorgang(
    buildPortalResolveInput({
      lead: {
        id: vorgang.auftrag.id,
        status: vorgang.state === "neu" ? "neu" : "auftrag",
        situation: lead.situation,
        funnel_daten: lead.funnel_daten,
        hv_meldung_status: lead.hv_meldung_status,
        plz: lead.plz,
        bereiche: lead.bereiche,
        created_at: vorgang.auftrag.start_datum ?? undefined,
      },
      auftrag: {
        id: vorgang.auftrag.id,
        status: vorgang.auftrag.status,
        positionen: vorgang.auftrag.positionen.map((p) => ({
          handwerker_id: p.handwerker_id,
          handwerker_status: p.handwerker_status,
        })),
      },
    })
  );

  return resolveVorgangDisplay(resolved, "handwerker");
}

export function resolvePartnerVorgangListenStatus(
  vorgangState: VorgangState | undefined,
  item: Pick<PartnerAuftragItem, "status" | "bautagebuchAnfrageOffen">
): { label: string; pillKey: string; actionHint: string | null } {
  if (
    item.bautagebuchAnfrageOffen &&
    (!vorgangState || vorgangState === "in_bearbeitung")
  ) {
    return { label: "Tagebuch offen", pillKey: "bautagebuch", actionHint: null };
  }
  if (vorgangState) {
    return {
      label: vorgangStateLabel(vorgangState),
      pillKey: vorgangStatePillKey(vorgangState),
      actionHint: null,
    };
  }
  return {
    label: partnerAuftragListenStatusLabel(item.status),
    pillKey: partnerAuftragListenStatusPillKey(item.status),
    actionHint: null,
  };
}

/** Listen-Status inkl. CRM-Resolver-Hinweis (Wave 1 read-only). */
export function resolvePartnerVorgangCardStatus(vorgang: PartnerVorgangItem): {
  label: string;
  pillKey: string;
  actionHint: string | null;
} {
  const base = resolvePartnerVorgangListenStatus(vorgang.state, vorgang.auftrag);
  const crm = resolvePartnerHandwerkerCrmDisplay(vorgang);
  if (!crm?.actionHint) return base;
  return { ...base, actionHint: crm.actionHint };
}
