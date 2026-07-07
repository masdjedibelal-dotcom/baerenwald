/** Max. Nutzer-Nachrichten pro KI-Chat-Session (ohne Willkommensnachricht). */
export const KI_MAX_USER_MESSAGES = 50;

/** Max. Einträge im messages-Array pro API-Request (Missbrauch / Payload-Größe). */
export const KI_MAX_MESSAGES_PER_REQUEST = 62;

/** Max. Claude-Aufrufe pro IP und Stunde (öffentlicher Endpoint). */
export const KI_RATE_LIMIT_PER_HOUR = 30;

/** Textarea wächst bis zu dieser Zeilenzahl, danach Scroll im Feld. */
export const KI_TEXTAREA_MAX_LINES = 6;

export function countUserMessages(
  messages: readonly { role: string }[]
): number {
  return messages.filter((m) => m.role === "user").length;
}

const HANDWERK_SIGNAL =
  /\b(bad|badezimmer|heizung|maler|streichen|sanier|renovier|elektro|strom|dach|fenster|tür|garten|terrasse|handwerk|reparatur|notfall|umbau|fliesen|sanitär|wasserschaden|schimmel|trockenbau|fassade|boden|parkett|flies|winterdienst|reinigung|hausmeister|baum|gewerbe|wohnung|haus|plz|postleitzahl|m²|m2|qm|quadratmeter|auftrag|vorhaben|projekt|münchen|muenchen)\b/i;

const OBVIOUS_OFF_TOPIC: RegExp[] = [
  /\b(rezept|kochen|backen|restaurant empfehlung)\b/i,
  /\b(wetter|nachrichten|politik|wahl|aktien|krypto|bitcoin)\b/i,
  /\b(python|javascript|typescript|code schreiben|programmier|debugging)\b/i,
  /\b(witz|lustige geschichte|gedicht schreib|horoskop)\b/i,
  /\b(chatgpt|openai|claude)\b/i,
  /\b(arzt|medizin|diagnose|medikament)\b/i,
  /\b(anwalt|rechtliche beratung|steuererklärung)\b/i,
  /\b(übersetze|translate|englisch lernen|hausaufgabe)\b/i,
  /\b(film|serie|musik|spotify|fußball tipp)\b/i,
  /\b(schreib mir (einen |ein )?(artikel|essay|bericht|referat))\b/i,
  /\b(ausführliche recherche|tiefgehend recherchier|literaturverzeichnis|quellenangabe)\b/i,
  /\b(wissenschaftliche arbeit|bachelorarbeit|masterarbeit)\b/i,
  /\b(vergleiche (alle|verschiedene) (anbieter|firmen|portale))\b/i,
];

/** Lange Texte ohne Handwerksbezug (Recherche/Missbrauch). */
const LONG_OFF_TOPIC_MIN_LEN = 420;

/** Grobe Vorprüfung — nur eindeutig Off-Topic ohne Handwerksbezug. */
export function isObviousOffTopic(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (OBVIOUS_OFF_TOPIC.some((re) => re.test(t))) {
    return !HANDWERK_SIGNAL.test(t) || /\b(recherche|recherchier|essay|artikel)\b/i.test(t);
  }
  if (t.length >= LONG_OFF_TOPIC_MIN_LEN && !HANDWERK_SIGNAL.test(t)) {
    return true;
  }
  return false;
}

export const KI_OFF_TOPIC_REPLY =
  "Ich bin dein Handwerks-Assistent für München — Beratung zu Renovierung, Reparatur und Umbau (Bad, Heizung, Maler, Garten …). Was möchtest du am Haus oder in der Wohnung klären?";
