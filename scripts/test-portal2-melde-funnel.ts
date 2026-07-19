/**
 * Portal 2.0 TEIL C — Melde-Funnel (FACHFRAGEN, createStepValid/createNext).
 */
import {
  FACHFRAGEN,
  buildFachfragenLeadPayload,
  fachfragenComplete,
  fachfragenKeyFromMeldeBereich,
  getFachfragenForBereich,
} from "../src/lib/portal2/fachfragen";
import {
  MELDE_FUNNEL_INTRO,
  MELDE_FUNNEL_STEPS,
  MELDE_NOTFALL_OPTIONS,
  createNext,
  createStepValid,
  type MeldeFunnelDraft,
} from "../src/lib/portal2/melde-funnel";
import {
  buildUpcomingMeldeSlotOptions,
  formatMeldeSlotLine,
} from "../src/lib/portal2/melde-slots";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 TEIL C melde-funnel");

assert("intro title", MELDE_FUNNEL_INTRO.title === "Vorgang melden");
assert(
  "intro sub",
  MELDE_FUNNEL_INTRO.sub ===
    "Gleicher Meldeweg für Kunde, Eigentümer und Mieter."
);

const order = MELDE_FUNNEL_STEPS.map((s) => s[0]);
assert(
  "step order",
  order.join(",") ===
    "objekt,einheiten,bereich,kategorie,fachdetail,notfall,medien,beschreibung,stamm,verwaltung,regeln,termin,fertig"
);

assert("FACHFRAGEN 7 keys", Object.keys(FACHFRAGEN).length === 7);
assert("wasser 3", FACHFRAGEN.wasser.length === 3);
assert(
  "wasser q1 de",
  FACHFRAGEN.wasser[0]![0] === "Läuft aktuell Wasser aus?"
);
assert(
  "heizung q1 de",
  FACHFRAGEN.heizung[0]![0] === "Bleiben alle Heizkörper kalt?"
);
assert(
  "strom q3 de",
  FACHFRAGEN.strom[2]![0] === "Riecht es verschmort?"
);
assert(
  "fenster q1 de",
  FACHFRAGEN.fenster[0]![0] === "Lässt sich Fenster/Tür schließen?"
);
assert(
  "dach q1 de",
  FACHFRAGEN.dach[0]![0] === "Tritt aktiv Wasser ein?"
);

assert(
  "fenster_tuer → fenster",
  fachfragenKeyFromMeldeBereich("fenster_tuer") === "fenster"
);
assert(
  "getFachfragen wasser 3",
  getFachfragenForBereich("wasser").length === 3
);

const qs = getFachfragenForBereich("wasser");
const ans: Record<string, string> = {};
assert("incomplete", fachfragenComplete(qs, ans) === false);
ans[qs[0]!.id] = "ja";
ans[qs[1]!.id] = "nein";
ans[qs[2]!.id] = "ja";
assert("complete", fachfragenComplete(qs, ans) === true);

const payload = buildFachfragenLeadPayload("wasser", ans);
assert("payload key", payload.bereichKey === "wasser");
assert("payload items 3", payload.items.length === 3);
assert("payload answer bool", payload.items[0]!.answer === true);

const base: MeldeFunnelDraft = {
  objekt: "Lindenstr. 24",
  bereichId: "wasser",
  kategorie: "reparatur",
  fachdetailAnswers: ans,
  notfall: false,
  beschreibung: "Wasser tropft unter dem Waschbecken stark.",
  name: "Max Mustermann",
  email: "max@example.com",
  regelnAccepted: true,
  terminwunsch: "flexibel",
};

assert("valid objekt", createStepValid("objekt", base));
assert(
  "invalid beschreibung short",
  createStepValid("beschreibung", { ...base, beschreibung: "kurz" }) === false
);
assert("valid beschreibung", createStepValid("beschreibung", base));
assert(
  "invalid notfall",
  createStepValid("notfall", { ...base, notfall: undefined }) === false
);
assert("valid notfall", createStepValid("notfall", base));
assert("notfall options 2", MELDE_NOTFALL_OPTIONS.length === 2);
assert(
  "akut sub de",
  MELDE_NOTFALL_OPTIONS[1]!.de.sub.includes("ohne Freigabe-Wartezeit")
);

const next1 = createNext(MELDE_FUNNEL_STEPS, 0, base);
assert("createNext advance", next1.ok && next1.createStep === 1 && !next1.done);

const last = MELDE_FUNNEL_STEPS.length - 1;
const nextDone = createNext(MELDE_FUNNEL_STEPS, last, base);
assert("createNext done", nextDone.ok && nextDone.done === true);

const bad = createNext(MELDE_FUNNEL_STEPS, 0, { ...base, objekt: "" });
assert("createNext error", !bad.ok);

const slots = buildUpcomingMeldeSlotOptions(3, new Date("2026-07-16T12:00:00"));
assert("3 slots", slots.length === 3);
assert("slot has line", slots[0]!.line.includes("Uhr"));
assert(
  "format line",
  formatMeldeSlotLine({
    slot_beginn: "2026-07-16T07:00:00.000Z",
    slot_ende: "2026-07-16T09:00:00.000Z",
  }).length > 0
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-melde-funnel checks passed.");
