/**
 * Portal 2.0 A6 — Fehler-/Leer-Zustände: Mock-Texte 1:1.
 */
import {
  PORTAL_EMPTY_TITLE,
  PORTAL_STATE_SPEC_STRINGS,
  portalEmptySubtitle,
  resolvePortalStateCopy,
} from "../src/lib/portal2/portal-states";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 A6 states");

for (const s of PORTAL_STATE_SPEC_STRINGS) {
  assert(`spec string present: ${s}`, typeof s === "string" && s.length > 0);
}

assert("empty title", PORTAL_EMPTY_TITLE === "Noch keine Vorgänge");
assert(
  "empty subtitle kunde",
  portalEmptySubtitle("kunde") ===
    "Hier erscheinen Ihre Anfragen und Aufträge. Legen Sie den ersten Vorgang an."
);
assert(
  "empty subtitle handwerker",
  portalEmptySubtitle("handwerker") ===
    "Sobald Ihnen ein Auftrag zugewiesen wird, erscheint er hier."
);
assert(
  "empty subtitle mieter",
  portalEmptySubtitle("mieter") ===
    "Für Ihre Wohnung liegt aktuell keine Meldung vor."
);
assert(
  "empty subtitle eigentuemer",
  portalEmptySubtitle("eigentuemer") ===
    "Für Ihre Wohnung liegt aktuell keine Meldung vor."
);

{
  const c = resolvePortalStateCopy("leer", {
    role: "kunde",
    canCreate: true,
    createLabel: "Neuer Vorgang",
  });
  assert("leer title", c.title === "Noch keine Vorgänge");
  assert("leer primary create", c.primaryLabel === "+ Neuer Vorgang");
}

{
  const c = resolvePortalStateCopy("e404");
  assert("e404 title", c.title === "Seite nicht gefunden");
  assert("e404 primary", c.primaryLabel === "Zur Übersicht");
}

{
  const c = resolvePortalStateCopy("zugriff");
  assert("zugriff title", c.title === "Kein Zugriff");
  assert("zugriff primary", c.primaryLabel === "Zur Übersicht");
  assert("zugriff secondary", c.secondaryLabel === "Support kontaktieren");
}

{
  const c = resolvePortalStateCopy("server");
  assert("server title", c.title === "Etwas ist schiefgelaufen");
  assert("server primary", c.primaryLabel === "Erneut versuchen");
  assert("server secondary", c.secondaryLabel === "Support kontaktieren");
}

{
  const c = resolvePortalStateCopy("offline");
  assert("offline title", c.title === "Keine Verbindung");
  assert("offline primary", c.primaryLabel === "Erneut versuchen");
  assert("offline no secondary", c.secondaryLabel === null);
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-states checks passed.");
