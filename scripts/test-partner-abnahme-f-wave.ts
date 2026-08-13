/**
 * F-Wave Abnahme — CTA bleibt / Checks / Rechnung-Gate.
 */
import assert from "node:assert/strict";

import {
  allLeistungChecksDone,
  buildLeistungAbschlussChecks,
  flattenAbschlussChecksForPersist,
} from "../src/lib/partner/hw-abnahme";
import {
  partnerAbnahmeZielPositionen,
  partnerKannErledigtMelden,
  partnerZeigtAbschlussCta,
} from "../src/lib/partner/partner-position-erledigt";
import { partnerAuftragKannRechnungHochladen } from "../src/lib/partner/partner-auftrag-dokumente";
import type { PartnerAuftragItem } from "../src/lib/partner/get-partner-data";

const basePos = {
  id: "p1",
  handwerker_status: "uebernommen",
  aenderung_typ: null as null,
  leistung_status: "erledigt",
  leistung_name: "Heizung prüfen",
  handwerker_id: "hw1",
};

assert.equal(
  partnerKannErledigtMelden({
    positionen: [basePos],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
  }),
  true,
  "CTA nach Dokumentation"
);

assert.equal(
  partnerKannErledigtMelden({
    positionen: [
      basePos,
      {
        ...basePos,
        id: "p2",
        leistung_status: "in_arbeit",
        leistung_name: "Rohr tauschen",
      },
    ],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
  }),
  false,
  "CTA disabled solange nicht alle Leistungen dokumentiert"
);

assert.equal(
  partnerZeigtAbschlussCta({
    positionen: [
      basePos,
      {
        ...basePos,
        id: "p2",
        leistung_status: "in_arbeit",
        leistung_name: "Rohr tauschen",
      },
    ],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
  }),
  true,
  "CTA sichtbar (ausgegraut) solange Leistungen offen"
);

assert.equal(
  partnerKannErledigtMelden({
    positionen: [{ ...basePos, handwerker_status: "erledigt" }],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
  }),
  true,
  "CTA bleibt bei Legacy handwerker_status=erledigt solange unsigniert"
);

assert.equal(
  partnerKannErledigtMelden({
    positionen: [{ ...basePos, handwerker_status: "erledigt" }],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
    hwAbschlussSigniertAm: "2026-07-24T10:00:00Z",
  }),
  false,
  "kein CTA nach eigener Signatur"
);

assert.equal(
  partnerKannErledigtMelden({
    positionen: [basePos],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
    hwAbschlussSigniertAm: "2026-07-24T10:00:00Z",
    abnahmeFreigabeStatus: "abgelehnt",
  }),
  true,
  "CTA erneut nach CRM-Ablehnung"
);

assert.equal(
  partnerKannErledigtMelden({
    positionen: [basePos],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
    abnahmeProtokollUrl: "https://example.com/other-hw.pdf",
  }),
  true,
  "fremdes Protokoll blockiert eigenen CTA nicht"
);

const ziel = partnerAbnahmeZielPositionen([basePos]);
assert.equal(ziel.length, 1);

const checks = buildLeistungAbschlussChecks([basePos]);
assert.equal(checks[0]!.dokumentiert, true);
assert.equal(checks[0]!.checks.leistung, true);
assert.equal(allLeistungChecksDone(checks), true);

const flat = flattenAbschlussChecksForPersist(checks);
assert.equal(flat.global.leistung, true);
assert.equal(flat.leistungen.length, 1);

const item = {
  angebotHandwerkerId: "a1",
  status: "offen",
  angebotHwStatus: "uebernommen",
  projektvertrag_bestaetigt_am: null,
  hw_rechnung_eingereicht_at: null,
  hw_abschluss_signiert_am: null,
  abnahme_protokoll_url: null,
} as PartnerAuftragItem;

assert.equal(
  partnerAuftragKannRechnungHochladen(item),
  true,
  "Rechnung ohne Projektvertrag/Abnahme möglich"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    angebotHwStatus: "bestaetigt",
  }),
  false,
  "Rechnung erst nach hw_status=uebernommen"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    hw_abschluss_signiert_am: "2026-07-24T10:00:00Z",
  }),
  true,
  "Rechnung mit Abnahme weiterhin möglich"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    status: "abgeschlossen",
  }),
  true,
  "Rechnung auch bei erledigtem Auftrag"
);

console.log("audit F-wave abnahme checks passed.");
