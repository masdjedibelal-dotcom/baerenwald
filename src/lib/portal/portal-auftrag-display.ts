import { Calendar, MapPin } from "lucide-react";

import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import {
  buildAnfragePersonalSection,
  formatAnfrageListOrtLine,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import {
  normalizePortalAuftragStatus,
  portalAuftragAktuellePhaseLabel,
  portalAuftragPhasenStates,
} from "@/lib/portal/portal-auftrag-phasen";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { portalObjektLeistungsortSection } from "@/lib/portal/portal-objekt";
import { fmtPortalDate } from "@/lib/shared/portal-detail-format";

export type PortalAuftragPhasenInput = {
  status?: string | null;
  abgeschlossen?: boolean;
  hatAngebot?: boolean;
  fortschritt?: number | null;
};

export function formatAuftragListOrtLine(
  objekt?: PortalObjekt | null,
  lead?: PortalAnfrageLeadSource | null
): string {
  if (lead) return formatAnfrageListOrtLine(lead);
  if (!objekt) return "—";
  const plzOrt = [objekt.plz, objekt.ort].filter(Boolean).join(" ");
  const parts = [objekt.strasse, plzOrt].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function formatAuftragDatumSpan(
  start?: string | null,
  end?: string | null
): string | undefined {
  const startLabel = fmtPortalDate(start);
  const endLabel = fmtPortalDate(end);
  if (startLabel !== "—" && endLabel !== "—") return `${startLabel} – ${endLabel}`;
  if (startLabel !== "—") return startLabel;
  if (endLabel !== "—") return endLabel;
  return undefined;
}

export function buildAuftragCardMeta(
  objekt: PortalObjekt | null | undefined,
  lead: PortalAnfrageLeadSource | null | undefined,
  start?: string | null,
  end?: string | null
): PortalListCardMeta[] {
  const meta: PortalListCardMeta[] = [];
  const ortLine = formatAuftragListOrtLine(objekt, lead);
  if (ortLine !== "—") meta.push({ icon: MapPin, text: ortLine });
  const zeitraum = formatAuftragDatumSpan(start, end);
  if (zeitraum) meta.push({ icon: Calendar, text: zeitraum });
  return meta;
}

export function resolveAuftragPhasenInput(
  input: PortalAuftragPhasenInput
): {
  states: ReturnType<typeof portalAuftragPhasenStates>;
  aktuellePhase?: string;
  fortschritt?: number;
} {
  const status = normalizePortalAuftragStatus(
    input.status,
    Boolean(input.abgeschlossen)
  );
  const states = portalAuftragPhasenStates({
    status,
    hatAngebot: Boolean(input.hatAngebot),
  });
  const fortschritt =
    typeof input.fortschritt === "number" && Number.isFinite(input.fortschritt)
      ? Math.round(input.fortschritt)
      : undefined;
  return {
    states,
    aktuellePhase: portalAuftragAktuellePhaseLabel(states),
    fortschritt,
  };
}

export function buildAuftragPortalSections(opts: {
  lead: PortalAnfrageLeadSource | null | undefined;
  objekt: PortalObjekt | null | undefined;
}): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];
  if (opts.objekt) {
    const ort = portalObjektLeistungsortSection(opts.objekt);
    if (ort.rows?.length) sections.push(ort);
  }
  if (opts.lead) {
    const personal = buildAnfragePersonalSection(opts.lead);
    if (personal) sections.push(personal);
  }
  return sections;
}
