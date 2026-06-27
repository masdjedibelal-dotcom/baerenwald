import { Calendar, Hammer, MapPin } from "lucide-react";

import type { PortalListCardMeta } from "@/components/shared/PortalListCard";
import {
  buildAnfrageCardMeta,
  buildAnfrageProjektSection,
  formatAnfrageListOrtLine,
  formatAnfrageWasGemacht,
  formatAnfrageZeitraum,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import {
  buildPartnerAuftragKonditionZeilen,
  type PartnerAngebotPositionenFilter,
} from "@/lib/partner/partner-leistungen-display";
import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  buildNachreichungKonditionZeilen,
  buildPartnerKonditionZeilen,
  mergeKonditionNachreichungZeilen,
  mergeKonditionRueckfrageZeilen,
  mergeKonditionZeilenMitHw,
  type PartnerHwKonditionen,
  type PartnerNachreichungFilter,
} from "@/lib/partner/partner-konditionen";
import {
  buildAuftragCardMeta,
  formatAuftragDatumSpan,
  resolveAuftragPhasenInput,
} from "@/lib/portal/portal-auftrag-display";
import type { PortalDetailSection } from "@/lib/portal/portal-display";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { fmtPortalDate, fmtPortalRelativeTime } from "@/lib/shared/portal-detail-format";
import { buildPartnerLeistungsortSection } from "@/lib/partner/partner-portal-objekt";

export type PartnerAnfrageListExtras = {
  gewerk_name?: string;
  positionen?: Array<{ leistung?: string; beschreibung?: string }>;
};

export function buildPartnerAnfrageCardMeta(
  lead: PortalAnfrageLeadSource | null | undefined,
  extras?: PartnerAnfrageListExtras
): PortalListCardMeta[] {
  if (lead) {
    const meta = buildAnfrageCardMeta(lead);
    if (meta.length) return meta;
  }

  const meta: PortalListCardMeta[] = [];
  const was =
    (lead ? formatAnfrageWasGemacht(lead) : undefined) ||
    extras?.positionen
      ?.map((p) => (p.leistung || p.beschreibung || "").trim())
      .filter(Boolean)
      .join(" · ") ||
    extras?.gewerk_name;
  if (was) meta.push({ icon: Hammer, text: was });

  const ortLine = lead
    ? formatAnfrageListOrtLine(lead)
    : extras
      ? "—"
      : "—";
  if (ortLine !== "—") meta.push({ icon: MapPin, text: ortLine });

  const zeitraum = lead ? formatAnfrageZeitraum(lead) : undefined;
  if (zeitraum) meta.push({ icon: Calendar, text: zeitraum });

  return meta;
}

export function buildPartnerAngebotCardMeta(
  lead: PortalAnfrageLeadSource | null | undefined,
  date?: string | null,
  fallbackOrt?: { plz?: string | null; ort?: string | null }
): PortalListCardMeta[] {
  const meta: PortalListCardMeta[] = [];

  const ortLine = lead
    ? formatAnfrageListOrtLine(lead)
    : [fallbackOrt?.plz?.trim(), fallbackOrt?.ort?.trim()].filter(Boolean).join(" ") || "—";
  if (ortLine !== "—") meta.push({ icon: MapPin, text: ortLine });

  const dateLabel = fmtPortalDate(date);
  if (dateLabel !== "—") meta.push({ icon: Calendar, text: dateLabel });

  return meta;
}

export function buildPartnerAuftragCardMeta(
  objekt: PortalObjekt | null | undefined,
  lead: PortalAnfrageLeadSource | null | undefined,
  start?: string | null,
  end?: string | null
): PortalListCardMeta[] {
  return buildAuftragCardMeta(objekt, lead, start, end);
}

export function buildPartnerAnfragePortalSections(
  lead: PortalAnfrageLeadSource | null | undefined,
  opts?: {
    crm_leistungsumfang?: string | null;
  }
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];

  const ort = buildPartnerLeistungsortSection(lead?.objekt, lead);
  if (ort) sections.push(ort);

  const projekt = lead
    ? buildAnfrageProjektSection(lead, {
        crm_leistungsumfang: opts?.crm_leistungsumfang,
        kompakt: true,
      })
    : null;
  if (projekt) sections.push(projekt);

  return sections;
}

export function buildPartnerAngebotPortalSections(
  lead: PortalAnfrageLeadSource | null | undefined,
  opts?: {
    crm_leistungsumfang?: string | null;
  }
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];

  const ort = buildPartnerLeistungsortSection(lead?.objekt, lead);
  if (ort) sections.push(ort);

  const projekt = lead
    ? buildAnfrageProjektSection(lead, {
        crm_leistungsumfang: opts?.crm_leistungsumfang,
        kompakt: true,
      })
    : null;
  if (projekt) sections.push(projekt);

  return sections;
}

export function buildPartnerAuftragPortalSections(
  lead: PortalAnfrageLeadSource | null | undefined
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];
  const ort = buildPartnerLeistungsortSection(lead?.objekt, lead);
  if (ort) sections.push(ort);

  const projekt = lead
    ? buildAnfrageProjektSection(lead, { kompakt: true })
    : null;
  if (projekt) sections.push(projekt);

  return sections;
}

export function resolvePartnerKonditionZeilen(
  positionenRaw: unknown,
  filter?: PartnerAngebotPositionenFilter & Pick<PartnerNachreichungFilter, "gewerkName">,
  hwKonditionen?: PartnerHwKonditionen | null,
  opts?: {
    neueVerhandlungsrunde?: boolean;
    nachreichungOpenIds?: string[];
    auftragPositionen?: PartnerAuftragPosition[];
  }
) {
  const basis = opts?.nachreichungOpenIds?.length
    ? buildNachreichungKonditionZeilen(
        positionenRaw,
        opts.auftragPositionen,
        {
          gewerkId: filter?.gewerkId ?? undefined,
          handwerkerId: filter?.handwerkerId ?? undefined,
          gewerkName: filter?.gewerkName,
        }
      )
    : buildPartnerKonditionZeilen(positionenRaw, filter);
  if (opts?.nachreichungOpenIds?.length) {
    return mergeKonditionNachreichungZeilen(
      basis,
      hwKonditionen,
      opts.nachreichungOpenIds
    );
  }
  if (opts?.neueVerhandlungsrunde && hwKonditionen?.positionen.length) {
    return mergeKonditionRueckfrageZeilen(basis, hwKonditionen);
  }
  if (hwKonditionen?.positionen.length) {
    return mergeKonditionZeilenMitHw(basis, hwKonditionen);
  }
  return basis;
}

export function resolvePartnerAuftragKonditionZeilen(positionen: PartnerAuftragPosition[]) {
  return buildPartnerAuftragKonditionZeilen(positionen);
}

/** @deprecated Nutze resolvePartnerKonditionZeilen für Partner-Portal */
export function resolvePartnerAngebotPositionen(
  positionenRaw: unknown,
  filter?: PartnerAngebotPositionenFilter
) {
  const zeilen = resolvePartnerKonditionZeilen(positionenRaw, filter);
  return { zeilen };
}

export function resolvePartnerAuftragLeistungen(positionen: PartnerAuftragPosition[]) {
  return { zeilen: resolvePartnerAuftragKonditionZeilen(positionen) };
}

export const PARTNER_LEISTUNGEN_GESAMT_LABEL =
  "Vergütung Brutto inkl. MwSt.";

export const PARTNER_LEISTUNGEN_SECTION_TITLE = "Leistungen & Vergütung";

export const PARTNER_LEISTUNGEN_VORSCHLAG_LABEL = "Vorschlag netto";

export const PARTNER_LEISTUNGEN_ANGEBOTSPREIS_LABEL = "Angebotspreis netto";

export const PARTNER_LEISTUNGEN_DEIN_PREIS_LABEL = "Dein Preis netto";

export function partnerDetailDateMetaLine(date?: string | null): string | undefined {
  const formatted = fmtPortalDate(date);
  const rel = fmtPortalRelativeTime(date);
  const parts = [formatted !== "—" ? formatted : null, rel].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export function partnerAuftragDetailMetaLine(
  start?: string | null,
  end?: string | null
): string | undefined {
  return formatAuftragDatumSpan(start, end);
}

export type PartnerAuftragPhasenCardData = ReturnType<
  typeof resolveAuftragPhasenInput
>;

export function partnerAuftragListFooter(input: {
  status?: string | null;
  fortschritt?: number | null;
  hatAngebot?: boolean;
  abgeschlossen?: boolean;
}): PartnerAuftragPhasenCardData {
  return resolveAuftragPhasenInput({
    status: input.status,
    abgeschlossen: input.abgeschlossen,
    hatAngebot: input.hatAngebot,
    fortschritt: input.fortschritt,
  });
}
