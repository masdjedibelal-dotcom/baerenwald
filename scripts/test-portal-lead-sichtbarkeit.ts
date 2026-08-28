/**
 * Portal ↔ CRM: crm_direkt_angebot-Stubs nur nach Versand sichtbar.
 */
import assert from "node:assert/strict";

import {
  filterPortalListableLeads,
  isCrmDirektAngebotLead,
  isLeadPortalListbar,
} from "../src/lib/portal/portal-lead-sichtbarkeit";

const STUB_LEAD = {
  id: "b7f992bd-1b8e-4962-a8f4-d3700029686e",
  funnel_daten: { quelle: "crm_direkt_angebot", direkt_dokument: "angebot" },
};

const MELDUNG_LEAD = {
  id: "melde-1",
  funnel_daten: { quelle: "melde_link" },
};

assert.equal(isCrmDirektAngebotLead(STUB_LEAD), true);
assert.equal(isCrmDirektAngebotLead(MELDUNG_LEAD), false);

assert.equal(
  isLeadPortalListbar(STUB_LEAD, { angebote: [], auftraege: [] }),
  false,
  "orphan stub ohne Angebot/Auftrag"
);

assert.equal(
  isLeadPortalListbar(STUB_LEAD, {
    angebote: [
      {
        lead_id: STUB_LEAD.id,
        status_einfach: "entwurf",
        pdf_url: "https://example.com/a.pdf",
      },
    ],
    auftraege: [],
  }),
  false,
  "crm_direkt_angebot mit Entwurf"
);

assert.equal(
  isLeadPortalListbar(STUB_LEAD, {
    angebote: [
      {
        lead_id: STUB_LEAD.id,
        status_einfach: "gesendet",
        gesendet_am: "2026-08-27T10:00:00Z",
      },
    ],
    auftraege: [],
  }),
  true,
  "crm_direkt_angebot nach Versand"
);

assert.equal(
  isLeadPortalListbar(MELDUNG_LEAD, { angebote: [], auftraege: [] }),
  true,
  "echte Meldung ohne Angebot bleibt sichtbar"
);

const filtered = filterPortalListableLeads(
  [STUB_LEAD, MELDUNG_LEAD],
  { angebote: [], auftraege: [] }
);
assert.equal(filtered.length, 1);
assert.equal(filtered[0]!.id, MELDUNG_LEAD.id);

console.log("portal-lead-sichtbarkeit checks passed.");
