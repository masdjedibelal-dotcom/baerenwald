/**
 * Portal 2.0 A7 — Basisdaten-Anzeigeformen (Mock → real).
 */
import {
  formatHandwerkerTrade,
  formatMeldeObjektWe,
  formatMeldeSlotLine,
  resolveHandwerkerRating,
  toHandwerkerDisplay,
  toMeldeObjektDisplay,
  toMeldeSlotDisplay,
} from "../src/lib/portal2/basisdaten";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 A7 basisdaten");

{
  const d = toMeldeObjektDisplay({
    id: "o1",
    titel: "Lindenstraße 24",
    plz: "10115",
    ort: "Berlin-Mitte",
    einheiten_hinweis: "6 Wohneinheiten",
  });
  assert("objekt name", d.name === "Lindenstraße 24");
  assert("objekt adr", d.adr === "10115 Berlin-Mitte");
  assert("objekt we", d.we === "6 Wohneinheiten");
}

{
  const d = toMeldeObjektDisplay({
    id: "o2",
    titel: "Parkallee 9",
    plz: "10711",
    ort: "Berlin-Wilmersdorf",
    einheitenCount: 12,
  });
  assert("objekt we from count", d.we === "12 Wohneinheiten");
}

{
  const d = toMeldeObjektDisplay({
    id: "o3",
    titel: "Sonnenweg 7",
    plz: "12207",
    ort: "Berlin-Lichterfelde",
  });
  assert("objekt we omit when missing", d.we === null);
}

assert(
  "we helper 1",
  formatMeldeObjektWe(null, 1) === "1 Wohneinheit"
);

{
  // Do 10.07.2025 09:00–11:00 local
  const beginn = "2025-07-10T09:00:00";
  const ende = "2025-07-10T11:00:00";
  const [date, time] = toMeldeSlotDisplay({
    slot_beginn: beginn,
    slot_ende: ende,
  });
  assert("slot date", date === "Do 10.07.");
  assert("slot time", time === "09–11 Uhr");
  assert(
    "slot line",
    formatMeldeSlotLine({ slot_beginn: beginn, slot_ende: ende }) ===
      "Do 10.07. · 09–11 Uhr"
  );
}

{
  const [date, time] = toMeldeSlotDisplay({
    slot_beginn: "2025-07-11T13:00:00",
    slot_ende: "2025-07-11T15:00:00",
  });
  assert("slot fr date", date === "Fr 11.07.");
  assert("slot fr time", time === "13–15 Uhr");
}

{
  const hw = toHandwerkerDisplay({
    id: "sanitaer-nord",
    firma: "Sanitär Nord GmbH",
    gewerkNamen: ["Sanitär", "Heizung"],
    bewertung_gesamt: 4.8,
    bewertung_anzahl: 3,
  });
  assert("hw name", hw.name === "Sanitär Nord GmbH");
  assert("hw trade", hw.trade === "Sanitär · Heizung");
  assert("hw rating present", hw.rating === 4.8);
}

{
  const hw = toHandwerkerDisplay({
    id: "x",
    firma: "Ohne Rating GmbH",
    gewerkNamen: ["Elektro"],
    bewertung_gesamt: null,
    bewertung_anzahl: 0,
  });
  assert("hw no fake rating", hw.rating === undefined);
  assert("trade helper", formatHandwerkerTrade(["A", "B"]) === "A · B");
  assert(
    "rating resolver null",
    resolveHandwerkerRating({ bewertung_gesamt: 4.5, bewertung_anzahl: 0 }) ===
      undefined
  );
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-basisdaten checks passed.");
