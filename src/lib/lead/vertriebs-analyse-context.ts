import type { KundenVertriebsKontext } from "@/lib/lead/kunden-vertrieb-status";
import type { MarketingJourney } from "@/lib/marketing/journey-types";

export type KiChatVerlaufEntry = {
  role: string;
  content: string;
};

export type VertriebsAnalyseInput = {
  chatVerlauf?: KiChatVerlaufEntry[];
  funnelDaten?: Record<string, unknown>;
  marketingJourney?: MarketingJourney | null;
  kundenKontext?: KundenVertriebsKontext | null;
  leadMeta?: {
    situation?: string | null;
    bereiche?: string[];
    plz?: string | null;
    zeitraum?: string | null;
    preis_min?: number;
    preis_max?: number;
    kanal?: string;
    funnel_quelle?: string;
  };
};

function formatUtm(j: MarketingJourney): string {
  const u = j.utm;
  const parts: string[] = [];
  if (u.source) parts.push(`source=${u.source}`);
  if (u.medium) parts.push(`medium=${u.medium}`);
  if (u.campaign) parts.push(`campaign=${u.campaign}`);
  if (u.term) parts.push(`term=${u.term}`);
  if (u.content) parts.push(`content=${u.content}`);
  return parts.length ? parts.join(", ") : "keine UTM-Parameter";
}

function formatJourney(j: MarketingJourney): string {
  const lines: string[] = [
    `Landing: ${j.landingPath}`,
    `Referrer: ${j.referrer || "direkt / unbekannt"}`,
    `UTM: ${formatUtm(j)}`,
  ];
  if (j.entryLeistung) {
    lines.push(`Rechner-Einstieg Leistung: ${j.entryLeistung}`);
  }
  if (j.pages.length) {
    lines.push(
      "Besuchte Seiten:",
      ...j.pages.map((p) => `  - ${p.path}`).slice(-12)
    );
  }
  if (j.clicks.length) {
    lines.push(
      "Klicks / Interaktionen:",
      ...j.clicks.map((c) => `  - [${c.type}] ${c.label}${c.href ? ` → ${c.href}` : ""}`).slice(-15)
    );
  }
  return lines.join("\n");
}

function formatKunden(k: KundenVertriebsKontext): string {
  return [
    `Kundenart: ${k.kundenart === "neukunde" ? "Neukunde (erstmalig in DB)" : "Bestandskunde (bereits im System)"}`,
    `MeinBärenwald-Portal: ${k.portal_registriert ? "ja (auth verknüpft)" : "nein"}`,
    `Leads gesamt (inkl. diese Anfrage): ${k.anzahl_leads_gesamt}`,
    `Frühere Leads: ${k.anzahl_leads_bisher}`,
    k.kunde_seit ? `Kundenstamm seit: ${k.kunde_seit.slice(0, 10)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatFunnel(fd: Record<string, unknown>, meta?: VertriebsAnalyseInput["leadMeta"]): string {
  const lines: string[] = [];
  if (meta?.funnel_quelle) lines.push(`Funnel-Quelle: ${meta.funnel_quelle}`);
  if (meta?.situation) lines.push(`Situation: ${meta.situation}`);
  if (meta?.bereiche?.length) lines.push(`Bereiche/Gewerke: ${meta.bereiche.join(", ")}`);
  if (meta?.plz) lines.push(`PLZ: ${meta.plz}`);
  if (meta?.zeitraum) lines.push(`Zeitraum/Dringlichkeit: ${meta.zeitraum}`);
  if (meta?.preis_min != null && meta?.preis_max != null) {
    lines.push(`Preisrahmen Rechner: ${meta.preis_min} – ${meta.preis_max} €`);
  }

  const summary = fd.formattedSummary;
  if (typeof summary === "string" && summary.trim()) {
    lines.push("", "Funnel-Zusammenfassung:", summary.trim());
  }
  const tech = fd.technicalDetails;
  if (typeof tech === "string" && tech.trim()) {
    lines.push("", "Technische Details:", tech.trim());
  }
  const preisModus = fd.preis_modus;
  if (preisModus) lines.push(`Preis-Modus: ${String(preisModus)}`);

  return lines.join("\n") || "Keine Funnel-Details";
}

export function buildVertriebsAnalyseUserPrompt(input: VertriebsAnalyseInput): string {
  const parts: string[] = [];

  if (input.kundenKontext) {
    parts.push("=== KUNDENSTATUS ===\n", formatKunden(input.kundenKontext));
  }

  if (input.marketingJourney) {
    parts.push("\n\n=== HERKUNFT & AKTIVITÄT (Session) ===\n", formatJourney(input.marketingJourney));
  }

  const fd =
    input.funnelDaten && typeof input.funnelDaten === "object"
      ? input.funnelDaten
      : {};
  parts.push("\n\n=== ANFRAGE / FUNNEL ===\n", formatFunnel(fd, input.leadMeta));

  const chat = input.chatVerlauf?.filter((m) => m.content?.trim()) ?? [];
  if (chat.length) {
    const chatText = chat
      .map((m) => `${m.role === "user" ? "Kunde" : "Assistent"}: ${m.content}`)
      .join("\n");
    parts.push("\n\n=== KI-CHAT ===\n", chatText);
  } else {
    parts.push("\n\n=== KI-CHAT ===\n", "(kein Chat — nur Funnel/Website-Daten)");
  }

  return parts.join("");
}

export function hasVertriebsAnalyseGrundlage(input: VertriebsAnalyseInput): boolean {
  if (input.chatVerlauf?.some((m) => m.content?.trim())) return true;
  if (input.kundenKontext) return true;
  if (input.marketingJourney?.pages?.length || input.marketingJourney?.clicks?.length) {
    return true;
  }
  const fd = input.funnelDaten;
  if (fd && typeof fd === "object") {
    if (typeof fd.formattedSummary === "string" && fd.formattedSummary.trim()) return true;
    if (typeof fd.technicalDetails === "string" && fd.technicalDetails.trim()) return true;
  }
  if (input.leadMeta?.bereiche?.length) return true;
  return false;
}
