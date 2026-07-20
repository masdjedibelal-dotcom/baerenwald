/**
 * Portal 2.0 D1/D2 — HV Dashboard KPIs + Liste-Copy.
 */
import {
  HV_DASHBOARD_KPI_DEFS,
  HV_DASHBOARD_ROLE_LABEL,
  buildHvDashboardKpis,
  countLeadsByPortalFlow,
  resolveLeadPortalFlowStatus,
} from "../src/lib/portal2/hv-dashboard";
import {
  HV_ANGEBOT_BANNER,
  HV_CHIPS,
  HV_LISTE_PAGE_EYEBROW,
  HV_LISTE_PAGE_TITLE,
  HV_MELDUNG_ACTIONS,
  HV_SECTION_ANGEBOTE,
  HV_SECTION_MELDUNGEN,
  HV_BULK_DELETE_OFFENER_PUNKT,
} from "../src/lib/portal2/hv-liste";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D1/D2 hv dashboard+liste");

assert("role label", HV_DASHBOARD_ROLE_LABEL === "Hausverwaltung");
assert("3 kpi defs", HV_DASHBOARD_KPI_DEFS.length === 3);
assert(
  "kpi labels",
  HV_DASHBOARD_KPI_DEFS[0]!.label === "Wartet auf Freigabe" &&
    HV_DASHBOARD_KPI_DEFS[1]!.label === "In Arbeit" &&
    HV_DASHBOARD_KPI_DEFS[2]!.label === "Gesamt offen"
);

const flow = countLeadsByPortalFlow({
  leads: [
    {
      id: "l1",
      hv_meldung_status: "neu",
      org_freigabe_status: "ausstehend",
      created_at: "2026-07-01T10:00:00Z",
    },
    {
      id: "l2",
      hv_meldung_status: "angebot_eingefordert",
      org_freigabe_status: "freigegeben",
      created_at: "2026-07-02T10:00:00Z",
    },
  ],
  auftraege: [
    {
      id: "a1",
      lead_id: "l2",
      status: "in_arbeit",
      created_at: "2026-07-03T10:00:00Z",
    },
  ],
});

assert("has gemeldet", flow.gemeldet >= 1);
const kpis = buildHvDashboardKpis(flow);
assert("wartet = gemeldet", kpis.wartet_freigabe === flow.gemeldet);
assert(
  "gesamt offen formula",
  kpis.gesamt_offen ===
    flow.gemeldet + flow.freigegeben + flow.angefragt + flow.angebot
);

const st = resolveLeadPortalFlowStatus({
  lead: {
    id: "x",
    hv_meldung_status: "neu",
    org_freigabe_status: "ausstehend",
  },
});
assert("neu → gemeldet", st === "gemeldet");

assert("pageHead", HV_LISTE_PAGE_EYEBROW === "Hausverwaltung");
assert("page title", HV_LISTE_PAGE_TITLE === "Vorgänge");
assert("chips 3", HV_CHIPS.length === 3);
assert("chip freigabe", HV_CHIPS[0]!.label === "Zur Freigabe");
assert("section meldungen", HV_SECTION_MELDUNGEN === "Meldungen · Eingang");
assert("section angebote", HV_SECTION_ANGEBOTE === "Angebots-Freigabe");
assert(
  "banner",
  HV_ANGEBOT_BANNER ===
    "Bärenwald hat Angebote erstellt — bitte prüfen und freigeben."
);
assert(
  "meldung actions",
  HV_MELDUNG_ACTIONS[0]!.label === "Angebot einfordern" &&
    HV_MELDUNG_ACTIONS[1]!.label === "Kleinreparatur freigeben" &&
    HV_MELDUNG_ACTIONS[2]!.label === "Ablehnen"
);
assert("bulk offener punkt", HV_BULK_DELETE_OFFENER_PUNKT.includes("OFFENE-PUNKTE"));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-hv-d1d2 checks passed.");
