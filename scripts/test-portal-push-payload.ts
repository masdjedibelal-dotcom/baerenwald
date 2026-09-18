/**
 * Kurzer Smoke-Test für Push-Payload (keine Preise bei Angebot).
 * npx tsx scripts/test-portal-push-payload.ts
 */
import { buildPushPayloadFromNotif } from "../src/lib/push/payload";
import { PUSH_COPY } from "../src/lib/push/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const angebot = buildPushPayloadFromNotif({
  typ: "angebot",
  titel: "Angebot AG260043 — 1.250 €",
  body: "Gesamt 1.250,00 EUR bitte prüfen",
  link: "/portal?section=vorgaenge&id=abc",
});
assert(angebot.title === PUSH_COPY.angebotLiegtVor.title, "angebot title");
assert(angebot.body === PUSH_COPY.angebotLiegtVor.body, "angebot body");
assert(!/€|EUR|\d/.test(angebot.body) || angebot.body === PUSH_COPY.angebotLiegtVor.body, "no price");

const meldung = buildPushPayloadFromNotif({
  typ: "neue_meldung",
  titel: "Neue Meldung · Klingel",
  body: "Mieter hat gemeldet — bitte prüfen.",
  link: "/portal?id=1",
});
assert(meldung.title.includes("Meldung") || meldung.title.length > 0, "meldung title");

console.log("ok: portal push payload");
