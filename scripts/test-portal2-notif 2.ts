/**
 * Portal 2.0 B4 — notif Typen, Templates, Zeitformat.
 */
import {
  formatPortalNotifTemplate,
  formatPortalNotifTime,
  mapHvTypToPortalNotifTyp,
  mapPartnerTypToPortalNotifTyp,
  PORTAL_NOTIF_TEMPLATES,
  PORTAL_NOTIF_VISUAL,
  resolvePortalNotifVisual,
} from "../src/lib/portal2/notif-types";
import { partnerNotificationToPortalItem } from "../src/lib/portal2/notif-adapters";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B4 notifications");

assert("kunde angebot title", PORTAL_NOTIF_VISUAL.angebot.title === "Angebot freigabebereit");
assert("eigentuemer freigabe title", PORTAL_NOTIF_VISUAL.freigabe.title === "Kostenfreigabe nötig");
assert(
  "eigentuemer status title override",
  resolvePortalNotifVisual("status", "eigentuemer").title === "Angebot angenommen"
);
assert(
  "mieter termin title",
  resolvePortalNotifVisual("termin", "mieter").title === "Termin steht fest"
);
assert(
  "mieter status glyph",
  resolvePortalNotifVisual("status", "mieter").glyph === "🔧"
);
assert(
  "handwerker auftrag title",
  resolvePortalNotifVisual("auftrag", "handwerker").title === "Neuer Auftrag"
);

const kundeAngebot = formatPortalNotifTemplate(PORTAL_NOTIF_TEMPLATES.kunde.angebot, {
  nr: "AN-2041",
  titel: "Badsanierung",
});
assert(
  "kunde angebot template",
  kundeAngebot === 'Angebot AN-2041 „Badsanierung" wartet auf Ihre Freigabe.'
);

const eigentFreigabe = formatPortalNotifTemplate(
  PORTAL_NOTIF_TEMPLATES.eigentuemer.freigabe,
  { vg: "V-1042", betrag: "500 €" }
);
assert(
  "eigentuemer freigabe template",
  eigentFreigabe === "V-1042 überschreitet Ihren Schwellenwert (500 €)."
);

assert("partner neu → auftrag", mapPartnerTypToPortalNotifTyp("neu") === "auftrag");
assert(
  "hv angebot_freigabe → angebot",
  mapHvTypToPortalNotifTyp("angebot_freigabe") === "angebot"
);
assert(
  "hv kostenfreigabe → freigabe",
  mapHvTypToPortalNotifTyp("kostenfreigabe") === "freigabe"
);

const now = new Date("2026-07-16T12:00:00Z");
assert(
  "time vor Min",
  formatPortalNotifTime("2026-07-16T11:48:00Z", now) === "vor 12 Min"
);
assert(
  "time Gestern",
  formatPortalNotifTime("2026-07-15T10:00:00Z", now) === "Gestern"
);

const partnerItem = partnerNotificationToPortalItem({
  id: "1",
  handwerker_id: "h1",
  typ: "neu",
  projekt_name: "V-1042",
  leistung_name: "Wasserhahn Bad",
  gelesen: false,
  link: "/partner?vorgang=abc",
  created_at: "2026-07-16T11:52:00Z",
});
assert("partner item typ auftrag", partnerItem.typ === "auftrag");
assert("partner item unread", partnerItem.unread === true);
assert("partner item glyph", partnerItem.glyph === "🔧");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-notif checks passed.");
