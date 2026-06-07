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
  buildAngebotCardMeta,
  parseAngebotPositionenMitPreis,
  resolveAngebotGesamtBrutto,
  type PortalAngebotPositionDisplay,
} from "@/lib/portal/portal-angebot-display";
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
  positionen?: Array<{ beschreibung: string }>;
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
      ?.map((p) => p.beschreibung.trim())
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
  date?: string | null
): PortalListCardMeta[] {
  if (lead) return buildAngebotCardMeta(lead, date);
  const meta: PortalListCardMeta[] = [];
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
  opts?: { aufgabe_notiz?: string | null; gewerk_name?: string }
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];

  const ort = buildPartnerLeistungsortSection(lead?.objekt);
  if (ort) sections.push(ort);

  const projekt = lead ? buildAnfrageProjektSection(lead) : null;
  if (projekt) sections.push(projekt);

  const hinweisRows: Array<{ label: string; value?: string | null }> = [];
  if (opts?.gewerk_name?.trim()) {
    hinweisRows.push({ label: "Gewerk", value: opts.gewerk_name.trim() });
  }
  if (opts?.aufgabe_notiz?.trim()) {
    hinweisRows.push({ label: "Hinweis von Bärenwald", value: opts.aufgabe_notiz.trim() });
  }
  const hinweise = hinweisRows
    .map((r) => ({ label: r.label, value: r.value?.trim() }))
    .filter((r): r is { label: string; value: string } => Boolean(r.value));
  if (hinweise.length) {
    sections.push({ heading: "Aufgabe", rows: hinweise });
  }

  return sections;
}

export function buildPartnerAngebotPortalSections(
  lead: PortalAnfrageLeadSource | null | undefined,
  opts?: { gewerk_name?: string; zeitraum?: string }
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];

  const ort = buildPartnerLeistungsortSection(lead?.objekt);
  if (ort) sections.push(ort);

  const projekt = lead ? buildAnfrageProjektSection(lead) : null;
  if (projekt) sections.push(projekt);

  const rows: Array<{ label: string; value?: string | null }> = [];
  if (opts?.gewerk_name?.trim()) {
    rows.push({ label: "Gewerk", value: opts.gewerk_name });
  }
  if (opts?.zeitraum?.trim() && !lead) {
    rows.push({ label: "Zeitraum", value: opts.zeitraum });
  }
  const filtered = rows
    .map((r) => ({ label: r.label, value: r.value?.trim() }))
    .filter((r): r is { label: string; value: string } => Boolean(r.value));
  if (filtered.length) {
    sections.push({ heading: "Aufgabe", rows: filtered });
  }

  return sections;
}

export function buildPartnerAuftragPortalSections(
  lead: PortalAnfrageLeadSource | null | undefined
): PortalDetailSection[] {
  const sections: PortalDetailSection[] = [];
  const ort = buildPartnerLeistungsortSection(lead?.objekt);
  if (ort) sections.push(ort);

  const projekt = lead ? buildAnfrageProjektSection(lead) : null;
  if (projekt) sections.push(projekt);

  return sections;
}

export function resolvePartnerAngebotPositionen(
  positionenRaw: unknown,
  gesamt?: {
    gesamt_fix?: number | null;
    gesamt_min?: number | null;
    gesamt_max?: number | null;
  }
): {
  positionen: PortalAngebotPositionDisplay[];
  gesamtBrutto?: number;
} {
  const positionen = parseAngebotPositionenMitPreis(positionenRaw);
  const gesamtBrutto = resolveAngebotGesamtBrutto({
    positionen: positionenRaw,
    gesamt_fix: gesamt?.gesamt_fix,
    gesamt_min: gesamt?.gesamt_min,
    gesamt_max: gesamt?.gesamt_max,
  });
  return { positionen, gesamtBrutto };
}

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
