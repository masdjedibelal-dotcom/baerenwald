/**
 * Portal 2.0 D8 — Eigentümer-Rolle + Kostenfreigabe.
 */
import {
  EIGENTUEMER_DEFAULT_SCHWELLE_EUR,
  EIGENTUEMER_KOSTENFREIGABE_TITLE,
  eigentuemerNeedsKostenfreigabe,
  filterLeadsByEigentuemerObjekte,
  formatEigentuemerKostenfreigabeBody,
  formatEigentuemerKostenfreigabeNotif,
  formatEigentuemerSchwelle,
} from "../src/lib/portal2/eigentuemer";
import { portalCreateLabel as createLabelFromCreate } from "../src/lib/portal2/create";
import { buildPortalShellNav, getPortalNavItems } from "../src/lib/portal2/nav-items";
import {
  formatPortalNotifTemplate,
  PORTAL_NOTIF_TEMPLATES,
  PORTAL_NOTIF_VISUAL,
} from "../src/lib/portal2/notif-types";
import { resolveEigentuemerVorgangBetrag } from "../src/lib/portal/get-eigentuemer-portal-data";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D8 eigentuemer");

assert(
  "nav labels",
  getPortalNavItems("eigentuemer")
    .map((i) => i.label)
    .join(" · ") === "Dashboard · Vorgänge · Objekte"
);

const shell = buildPortalShellNav("eigentuemer", "eigentuemer");
assert("shell 3 items", shell.length === 3);
assert("shell objekte", shell[2]!.id === "objekte" && shell[2]!.label === "Objekte");

assert(
  "create label",
  createLabelFromCreate("eigentuemer") === "Anfrage erstellen"
);

assert("default schwelle", EIGENTUEMER_DEFAULT_SCHWELLE_EUR === 500);
assert(
  "schwelle format",
  formatEigentuemerSchwelle(500).includes("500")
);

assert(
  "needs freigabe über Schwelle",
  eigentuemerNeedsKostenfreigabe({
    betragEur: 750,
    schwelleEur: 500,
    freigabeStatus: "ausstehend",
  })
);
assert(
  "needs freigabe unter Schwelle",
  !eigentuemerNeedsKostenfreigabe({
    betragEur: 400,
    schwelleEur: 500,
  })
);
assert(
  "needs freigabe schon freigegeben",
  !eigentuemerNeedsKostenfreigabe({
    betragEur: 900,
    schwelleEur: 500,
    freigabeStatus: "freigegeben",
  })
);

const notif = formatEigentuemerKostenfreigabeNotif({
  vg: "V-1042",
  schwelleEur: 500,
});
assert("notif title", notif.title === EIGENTUEMER_KOSTENFREIGABE_TITLE);
assert(
  "notif body",
  notif.body === formatEigentuemerKostenfreigabeBody("V-1042", 500) &&
    notif.body.includes("V-1042") &&
    notif.body.includes("Schwellenwert")
);

assert(
  "visual freigabe title",
  PORTAL_NOTIF_VISUAL.freigabe.title === "Kostenfreigabe nötig"
);
assert(
  "template body",
  formatPortalNotifTemplate(PORTAL_NOTIF_TEMPLATES.eigentuemer.freigabe, {
    vg: "V-1042",
    betrag: "500 €",
  }) === "V-1042 überschreitet Ihren Schwellenwert (500 €)."
);

const filtered = filterLeadsByEigentuemerObjekte(
  [
    { id: "1", kunde_objekt_id: "o1" },
    { id: "2", kunde_objekt_id: "o2" },
    { id: "3", kunde_objekt_id: null },
  ],
  ["o1"]
);
assert("listFor filter", filtered.length === 1 && filtered[0]!.id === "1");
assert(
  "listFor empty zuordnung",
  filterLeadsByEigentuemerObjekte(
    [{ id: "1", kunde_objekt_id: "o1" }],
    []
  ).length === 0
);

assert(
  "betrag max",
  resolveEigentuemerVorgangBetrag({
    angebotBrutto: 600,
    preisMax: 400,
  }) === 600
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-eigentuemer checks passed.");
