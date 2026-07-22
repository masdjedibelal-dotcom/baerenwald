/**
 * Portal 2.0 TEIL E / E1–E2 — Objekte-Liste + Wizard + Lösch-Schutz.
 */
import {
  buildObjCardModel,
  countOffeneByObjektId,
  decodeObjektMeta,
  encodeObjektMeta,
  formatEinheitenHinweis,
  formatObjCardEinheiten,
  formatObjektAdresse,
  formatObjektTypLine,
  leadIsOffenAmObjekt,
  nextObjektKopieName,
  OBJ_DELETE_BLOCKED,
  OBJ_DETAIL_TABS,
  OBJ_MIETER_MENU,
  OBJ_WIZ_STEPS,
  formatObjektIdKurz,
  formatObjRegelnReview,
  objDeleteConfirm,
  objektHasActiveVorgaenge,
  objWizNext,
  objWizValid,
  openObjEditDraft,
  parseEinheitenCount,
  resolveObjMieterPortalStatus,
} from "../src/lib/portal2/objekte";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 TEIL E / E1 objekte");

assert("5 wizard steps", OBJ_WIZ_STEPS.length === 5);
assert("stamm invalid empty", !objWizValid("stamm", {}));
assert(
  "stamm valid",
  objWizValid("stamm", {
    name: "Lindenstr. 24",
    typ: "Mehrfamilienhaus",
    strasse: "Lindenstr.",
    hausnummer: "24",
    plz: "10115",
    ort: "Berlin",
  })
);
assert("einheiten default ok", objWizValid("einheiten", {}));
assert("einheiten 0 fail", !objWizValid("einheiten", { we: 0 }));
assert("verwaltung optional", objWizValid("verwaltung", {}));
assert("verwaltung ok empty", objWizValid("verwaltung", { kontakt: "" }));

const next = objWizNext(OBJ_WIZ_STEPS, 0, {
  name: "Parkallee 9",
  typ: "Wohnanlage",
  strasse: "Parkallee",
  hausnummer: "9",
  plz: "81477",
  ort: "München",
});
assert(
  "next advances",
  next.ok && !("done" in next && next.done) && next.ok && "stepIndex" in next && next.stepIndex === 1
);

const done = objWizNext(
  OBJ_WIZ_STEPS,
  OBJ_WIZ_STEPS.length - 1,
  {
    name: "Parkallee 9",
    typ: "Wohnanlage",
    strasse: "Parkallee",
    hausnummer: "9",
    plz: "81477",
    ort: "München",
    we: 12,
    kontakt: "C. Steiner",
    email: "c@steiner.de",
    tel: "089",
    schwelle: 1000,
  }
);
assert("finish ok", done.ok && done.done === true);
if (done.ok && done.done) {
  assert("payload titel", done.payload.titel === "Parkallee 9");
  assert("payload we hint", done.payload.einheiten_hinweis.includes("12"));
  assert("payload typ", done.payload.typ === "Wohnanlage");
  assert("payload schwelle", done.payload.freigabe_schwelle_eur === 1000);
  assert("payload strasse", done.payload.strasse === "Parkallee");
  assert("payload hausnummer", done.payload.hausnummer === "9");
  assert("payload plz", done.payload.plz === "81477");
  assert("payload ort", done.payload.ort === "München");
  const meta = decodeObjektMeta(done.payload.notizen_intern);
  assert("meta typ", meta.typ === "Wohnanlage");
  assert("meta kontakt", meta.kontakt === "C. Steiner");
  assert("meta email", meta.email === "c@steiner.de");
}

const metaRound = encodeObjektMeta({ typ: "Wohnanlage" }, "Notiz");
assert(
  "meta roundtrip",
  decodeObjektMeta(metaRound).typ === "Wohnanlage" &&
    metaRound.includes("Notiz")
);

assert("parse we", parseEinheitenCount("6 Wohneinheiten") === 6);
assert("hint format", formatEinheitenHinweis(1) === "1 Wohneinheit");
assert(
  "typ line",
  formatObjektTypLine({
    notizen_intern: encodeObjektMeta({ typ: "Mehrfamilienhaus" }),
    einheiten_hinweis: "6 Wohneinheiten",
  }) === "Mehrfamilienhaus · 6 WE"
);
assert(
  "typ column preferred",
  formatObjektTypLine({
    typ: "Wohnanlage",
    notizen_intern: encodeObjektMeta({ typ: "Mehrfamilienhaus" }),
    einheiten_hinweis: "12 Wohneinheiten",
  }) === "Wohnanlage · 12 WE"
);

assert(
  "card einheiten",
  formatObjCardEinheiten("6 Wohneinheiten") === "6 Wohneinheiten"
);
assert(
  "card einheiten from count",
  formatObjCardEinheiten(null, 6) === "6 Wohneinheiten"
);
assert(
  "adresse line",
  formatObjektAdresse({
    strasse: "Lindenstr.",
    hausnummer: "24",
    plz: "10115",
    ort: "Berlin",
  }) === "Lindenstr. 24 · 10115 Berlin"
);

const card = buildObjCardModel(
  {
    id: "1",
    titel: "Lindenstr. 24",
    strasse: "Lindenstr.",
    hausnummer: "24",
    plz: "10115",
    ort: "Berlin",
    typ: "Mehrfamilienhaus",
    einheiten_hinweis: "6 Wohneinheiten",
  },
  2
);
assert("card name", card.name === "Lindenstr. 24");
assert("card adresse", card.adresse.includes("Lindenstr. 24"));
assert("card we badge", card.einheitenLabel === "6 Wohneinheiten");
assert("card offen", card.offen === 2);

assert(
  "kopie name",
  nextObjektKopieName("Parkallee 9", ["Parkallee 9"]) === "Parkallee 9 (Kopie)"
);
assert(
  "kopie 2",
  nextObjektKopieName("Parkallee 9", [
    "Parkallee 9",
    "Parkallee 9 (Kopie)",
  ]) === "Parkallee 9 (Kopie 2)"
);

assert(
  "offen lead",
  leadIsOffenAmObjekt({ status: "neu", vorgang_phase: null })
);
assert(
  "nicht offen abgeschlossen",
  !leadIsOffenAmObjekt({ vorgang_phase: "abgeschlossen" })
);

const counts = countOffeneByObjektId([
  { kunde_objekt_id: "a", status: "neu" },
  { kunde_objekt_id: "a", vorgang_phase: "abgeschlossen" },
  { kunde_objekt_id: "b", status: "storniert" },
]);
assert("count a=1", counts.a === 1);
assert("count b missing", counts.b === undefined);

assert("delete blocked", objektHasActiveVorgaenge(2));
assert("delete ok", !objektHasActiveVorgaenge(0));
assert(
  "confirm text",
  objDeleteConfirm("X").includes("X") && OBJ_DELETE_BLOCKED.includes("offene")
);

assert("5 detail tabs", OBJ_DETAIL_TABS.length === 5);
assert("mieter tab", OBJ_DETAIL_TABS.some((t) => t.id === "mieter"));
assert(
  "tab order",
  OBJ_DETAIL_TABS.map((t) => t.id).join(",") ===
    "stamm,mieter,vorgaenge,regeln,dokumente"
);

const editDraft = openObjEditDraft(
  {
    titel: "Lindenstr. 24",
    typ: "Mehrfamilienhaus",
    strasse: "Lindenstr.",
    hausnummer: "24",
    plz: "10115",
    ort: "Berlin",
    einheiten_hinweis: "6 Wohneinheiten",
    freigabe_schwelle_eur: 750,
    notizen_intern: encodeObjektMeta({
      kontakt: "C.",
      email: "c@beispiel.de",
      tel: "089",
    }),
  },
  "Fallback HV"
);
assert("openObjEdit name", editDraft.name === "Lindenstr. 24");
assert("openObjEdit typ", editDraft.typ === "Mehrfamilienhaus");
assert("openObjEdit strasse", editDraft.strasse === "Lindenstr.");
assert("openObjEdit hausnummer", editDraft.hausnummer === "24");
assert("openObjEdit plz", editDraft.plz === "10115");
assert("openObjEdit ort", editDraft.ort === "Berlin");
assert("openObjEdit we", editDraft.we === 6);
assert("openObjEdit kontakt", editDraft.kontakt === "C.");
assert("openObjEdit email", editDraft.email === "c@beispiel.de");
assert("openObjEdit schwelle", editDraft.schwelle === 750);

assert("objekt id kurz", formatObjektIdKurz("abcd-efgh").startsWith("OBJ-ABCD"));
assert(
  "regeln review",
  formatObjRegelnReview(false, 500).startsWith("Freigabeschwelle") &&
    formatObjRegelnReview(false, 500).includes("500")
);
assert("mieter menu einladen", OBJ_MIETER_MENU.einladen.includes("einladen"));
assert("mieter menu entfernen", OBJ_MIETER_MENU.entfernen.includes("entfernen"));
assert(
  "mieter status email",
  resolveObjMieterPortalStatus({ email: "a@b.de" }) === "eingeladen"
);
assert(
  "mieter status leer",
  resolveObjMieterPortalStatus({}) === "nicht"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-objekte checks passed.");
