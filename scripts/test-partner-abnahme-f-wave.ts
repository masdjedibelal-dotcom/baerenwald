/**
 * F-Wave — Erledigt ohne Abnahme / Rechnung-Gate.
 */
import assert from "node:assert/strict";

import {
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
    positionen: [basePos],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
    hwErledigtGemeldetAm: "2026-07-24T10:00:00Z",
  }),
  false,
  "kein CTA nach Erledigt-Meldung"
);

assert.equal(
  partnerKannErledigtMelden({
    positionen: [basePos],
    vorgangState: "in_bearbeitung",
    auftragStatus: "offen",
    hwAbschlussSigniertAm: "2026-07-24T10:00:00Z",
  }),
  false,
  "kein CTA nach Legacy-Signatur"
);

const item = {
  angebotHandwerkerId: "a1",
  status: "offen",
  angebotHwStatus: "uebernommen",
  projektvertrag_bestaetigt_am: null,
  hw_rechnung_eingereicht_at: null,
  hw_erledigt_gemeldet_am: null,
  hw_abschluss_signiert_am: null,
  abnahme_protokoll_url: null,
} as PartnerAuftragItem;

assert.equal(
  partnerAuftragKannRechnungHochladen(item),
  false,
  "Rechnung erst nach Erledigt"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    angebotHwStatus: "bestaetigt",
    hw_erledigt_gemeldet_am: "2026-07-24T10:00:00Z",
  }),
  true,
  "Rechnung nach CRM-Freigabe + HW-erledigt"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    angebotHwStatus: "offen",
  }),
  false,
  "Rechnung ohne CRM-Freigabe nicht möglich"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    hw_erledigt_gemeldet_am: "2026-07-24T10:00:00Z",
  }),
  true,
  "Rechnung nach Erledigt-Meldung möglich"
);

assert.equal(
  partnerAuftragKannRechnungHochladen(item, { abschlussDoneLocal: true }),
  true,
  "Rechnung direkt nach lokalem Erledigt möglich"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    angebotHandwerkerId: null,
    angebotHwStatus: "uebernommen",
    hw_erledigt_gemeldet_am: "2026-07-24T10:00:00Z",
  }),
  true,
  "Direktauftrag: Rechnung ohne angebotHandwerkerId möglich"
);

assert.equal(
  partnerAuftragKannRechnungHochladen({
    ...item,
    hw_abschluss_signiert_am: "2026-07-24T10:00:00Z",
  }),
  true,
  "Legacy-Signatur unlockt Rechnung weiterhin"
);

console.log("audit F-wave erledigt-ohne-abnahme checks passed.");
