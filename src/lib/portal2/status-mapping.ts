/**
 * Portal 2.0 — Mapping Mock-STATUS/FLOW ↔ reale Felder
 *
 * Pflicht-Artefakt A4. Timelines, Chips, Aktionen und Notifications
 * binden an `resolvePortalFlowStatus` / `PORTAL_FLOW_MAPPING`.
 *
 * Regel: `leads.vorgang_phase` ist **kein** Source of Truth —
 * kanonisch ist `resolveVorgang()` (+ HV-/HW-Signale unten).
 */

import type { ResolvedVorgang } from "@/lib/crm-vorgang/types";
import {
  MIETER_STG,
  PORTAL_FLOW,
  PORTAL_FLOW_TIMELINE,
  PORTAL_STATUS,
  portalFlowTimelineIndex,
  portalFlowToMieterStg,
  type PortalMockStatusId,
  type PortalMockStatusMeta,
} from "@/lib/portal2/status";

/**
 * Zusätzliche Signale, die der Resolver allein nicht trägt
 * (HV-Freigabe-Detail, HW-Angebot, Signatur).
 */
export type PortalFlowExtraSignals = {
  org_freigabe_status?: string | null;
  hv_meldung_status?: string | null;
  /** Mindestens eine Handwerker-Anfrage / Zuweisung offen oder gestellt */
  hwAngefragt?: boolean;
  /** HW-Kalkulation eingereicht (quelle handwerker) oder Kunden-Angebot gesendet */
  angebotVorgelegt?: boolean;
  /** Digitale Signatur / hv_portal_abnahmen / Partner-Signatur vorhanden */
  signaturVorhanden?: boolean;
  /** Auftrag in Abnahme, Signatur noch ausstehend */
  abnahmeOffen?: boolean;
};

export type PortalFlowResolveInput = {
  resolved: ResolvedVorgang;
  extra?: PortalFlowExtraSignals;
};

/**
 * Kanonische Mapping-Tabelle (Mock ↔ Real).
 * Wird 1:1 im Entscheidungslog dokumentiert — bei Schema-Änderungen hier + Log.
 */
export const PORTAL_FLOW_MAPPING: Record<
  PortalMockStatusId,
  {
    label: string;
    /** Primäre reale Bedingungen (OR innerhalb, AND über Zeilen = Ableitungslogik in resolve) */
    realFields: string[];
    notes: string;
  }
> = {
  gemeldet: {
    label: PORTAL_STATUS.gemeldet.label,
    realFields: [
      "leads (existiert)",
      "resolveVorgang.phase = anfrage",
      "hv_meldung_status ∈ {neu, null} (typisch)",
      "org_freigabe_status ∈ {ausstehend, nicht_noetig} ODER Freigabe noch nicht durch",
    ],
    notes:
      "Startzustand nach Melde-Submit. vorgang_phase am Lead wird nicht gelesen.",
  },
  freigegeben: {
    label: PORTAL_STATUS.freigegeben.label,
    realFields: [
      "org_freigabe_status = freigegeben",
      "ODER freigabe_modus=direkt / nicht_noetig + Weiterleitung erfolgt",
      "hv_meldung_status = angebot_eingefordert (häufig nach Freigabe-Aktion)",
      "resolveVorgang.badges.wartet_freigabe = false",
    ],
    notes:
      "HV-Aktion „Angebot einfordern“ / Freigabe. Privatkunde: oft übersprungen (automatisch freigegeben).",
  },
  angefragt: {
    label: PORTAL_STATUS.angefragt.label,
    realFields: [
      "Handwerker-Anfrage gestellt (CRM send-handwerker / Partner-Zuweisung)",
      "angebot_handwerker existiert ODER auftraege.handwerkerAktionOffen",
      "resolveVorgang: phase=angebot + unterstatus=entwurf ODER actor=handwerker",
      "extra.hwAngefragt = true",
    ],
    notes: "Noch kein eingereichtes/vorgelegtes Angebot an die HV.",
  },
  angebot: {
    label: PORTAL_STATUS.angebot.label,
    realFields: [
      "angebote.status_einfach/status ∈ {gesendet, angenommen} (Kunden-/CRM-Angebot)",
      "ODER angebot_handwerker eingereicht (Quelle handwerker) — D11",
      "resolveVorgang.phase = angebot, unterstatus ∈ {gesendet, angenommen}",
      "extra.angebotVorgelegt = true",
    ],
    notes:
      "HV sieht „Empfohlenes Angebot“ (ein Angebot im Layout, Daten mehrfachfähig — ENTSCHEIDUNG 10).",
  },
  auftrag: {
    label: PORTAL_STATUS.auftrag.label,
    realFields: [
      "auftraege existiert",
      "auftraege.status ∈ {offen, in_arbeit} (≠ storniert)",
      "resolveVorgang.phase = auftrag, unterstatus ∈ {offen, in_arbeit}",
      "ggf. projektvertrag_bestaetigt_am / hw_status = uebernommen",
    ],
    notes: "Beauftragt = aktiver Auftrag, Ausführung läuft.",
  },
  abschluss: {
    label: PORTAL_STATUS.abschluss.label,
    realFields: [
      "auftraege.status = abnahme",
      "ODER hv_portal_abnahmen (signiert_am, signatur_png)",
      "ODER Partner-/Kunden-Signatur (G4)",
      "extra.signaturVorhanden | extra.abnahmeOffen",
      "resolveVorgang.phase = auftrag, unterstatus = abnahme (oder abgeschlossen vor Rechnung)",
    ],
    notes:
      "Signatur-Zustände: Tabelle hv_portal_abnahmen; Partner-Signatur separat. Beidseitige Gegenzeichnung = G4.",
  },
  rechnung: {
    label: PORTAL_STATUS.rechnung.label,
    realFields: [
      "rechnungen.status ∈ {entwurf, gesendet}",
      "resolveVorgang.phase = rechnung, unterstatus ≠ bezahlt",
      "ueberfaellig möglich (Badge, Status bleibt rechnung)",
    ],
    notes: "Mieter sieht diesen Schritt nicht (STG verdichtet → in_bearbeitung).",
  },
  bezahlt: {
    label: PORTAL_STATUS.bezahlt.label,
    realFields: [
      "rechnungen.status = bezahlt",
      "resolveVorgang.phase = rechnung, unterstatus = bezahlt",
      "ODER Vorgang erledigt ohne Rechnung (portalErledigt) → UI „Abgeschlossen“",
    ],
    notes: "Mock-Label „Abgeschlossen“; intern Key bezahlt.",
  },
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Leitet den aktuellen Mock-FLOW-Status ab (höchster erreichter Meilenstein).
 * Timelines: alle FLOW-Schritte mit index <= current sind „done“.
 */
export function resolvePortalFlowStatus(
  input: PortalFlowResolveInput
): PortalMockStatusId {
  const { resolved, extra = {} } = input;
  const freigabe = norm(extra.org_freigabe_status);
  const hv = norm(extra.hv_meldung_status);
  const u = norm(resolved.unterstatus);

  if (resolved.phase === "rechnung" && u === "bezahlt") {
    return "bezahlt";
  }
  if (resolved.phase === "rechnung") {
    return "rechnung";
  }

  if (
    extra.signaturVorhanden ||
    (resolved.phase === "auftrag" && (u === "abnahme" || extra.abnahmeOffen))
  ) {
    return "abschluss";
  }

  if (
    resolved.phase === "auftrag" &&
    (u === "abgeschlossen" || u === "offen" || u === "in_arbeit" || u === "abnahme")
  ) {
    if (u === "abnahme") return "abschluss";
    if (u === "abgeschlossen" && !extra.signaturVorhanden) {
      // Auftrag fertig, noch keine Rechnung → Abschluss-Meilenstein
      return "abschluss";
    }
    return "auftrag";
  }

  if (
    extra.angebotVorgelegt ||
    (resolved.phase === "angebot" &&
      (u === "gesendet" || u === "angenommen"))
  ) {
    return "angebot";
  }

  if (
    extra.hwAngefragt ||
    resolved.actor === "handwerker" ||
    (resolved.phase === "angebot" && (u === "entwurf" || u === "ersetzt"))
  ) {
    return "angefragt";
  }

  if (freigabe === "freigegeben" || hv === "angebot_eingefordert") {
    return "freigegeben";
  }

  // Direkt ohne Freigabe-Warteschlange, aber schon über „neu“ hinaus
  if (
    resolved.phase === "anfrage" &&
    !resolved.badges.wartet_freigabe &&
    freigabe === "nicht_noetig" &&
    hv !== "neu" &&
    hv !== ""
  ) {
    return "freigegeben";
  }

  return "gemeldet";
}

export function portalFlowTimeline(
  current: PortalMockStatusId
): Array<PortalMockStatusMeta & { done: boolean; active: boolean }> {
  const cur = portalFlowTimelineIndex(current);
  return PORTAL_FLOW_TIMELINE.map((id, i) => ({
    ...PORTAL_STATUS[id],
    done: i < cur,
    active: i === cur,
  }));
}

/**
 * Mieter-Detail-Timeline: kein Angebots-Schritt, „Auftrag“ → „Bestätigung“.
 * Schritte = MIETER_STG (Eingegangen · In Bearbeitung · Bestätigung · Erledigt).
 */
export function portalMieterFlowTimeline(
  current: PortalMockStatusId
): Array<{ id: string; label: string; done: boolean; active: boolean }> {
  const stufe = portalFlowToMieterStg(current);
  const order = MIETER_STG.map((s) => s.id);
  let idx = order.indexOf(stufe);
  if (idx < 0) idx = 0;
  return MIETER_STG.map((s, i) => ({
    id: s.id,
    label: s.title_de,
    done: i < idx,
    active: i === idx,
  }));
}

export function portalFlowMeta(id: PortalMockStatusId): PortalMockStatusMeta {
  return PORTAL_STATUS[id];
}
