import { KI_OFF_TOPIC_REPLY } from "@/lib/ki-rechner/guards";
import type { KiParsedPayload } from "@/lib/ki-rechner/types";

/** Interne/meta Formulierungen — nie im Chat anzeigen. */
export function isMetaKiAntwort(antwort: string): boolean {
  const t = antwort.trim().toLowerCase();
  if (!t) return true;
  return (
    /nutzer aufgefordert|keine erkennbare|interne notiz|meta[- ]?antwort/.test(
      t
    ) || /^nutzer\b/.test(t)
  );
}

/** JSON/Markdown-Blöcke aus sichtbarem Chat-Text entfernen. */
export function stripStructuredKiPayload(content: string): string {
  let t = content.trim();
  t = t.replace(/```(?:json)?\s*[\s\S]*?```/gi, "").trim();
  const jsonMatch = t.match(/\{[\s\S]*"typ"\s*:[\s\S]*\}/);
  if (jsonMatch) {
    t = t.replace(jsonMatch[0], "").trim();
  }
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** Nur nutzerfreundlichen Text für die Chat-Blase — nie Roh-JSON. */
export function getKiAssistantDisplayText(
  content: string,
  parsed: KiParsedPayload | null,
  typ: string
): string {
  const stripped = stripStructuredKiPayload(content);

  const parsedAntwort =
    parsed && "antwort" in parsed && typeof parsed.antwort === "string"
      ? parsed.antwort.trim()
      : "";

  if (parsedAntwort && !isMetaKiAntwort(parsedAntwort)) {
    if (stripped.length > parsedAntwort.length && !isMetaKiAntwort(stripped)) {
      return stripped;
    }
    return parsedAntwort;
  }

  if (stripped && !isMetaKiAntwort(stripped)) {
    return stripped;
  }

  if (typ === "off_topic") {
    return KI_OFF_TOPIC_REPLY;
  }

  return stripped || "Was möchtest du am Haus oder in der Wohnung machen?";
}

/** JSON aus Claude-Antwort extrahieren (auch in Markdown-Codeblöcken). */
export function parseKiResponseContent(content: string): {
  parsed: KiParsedPayload | null;
  typ: string;
} {
  const trimmed = content.trim();
  const candidates: string[] = [trimmed];

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const obj = JSON.parse(raw) as KiParsedPayload;
      if (obj && typeof obj === "object" && "typ" in obj) {
        return { parsed: obj, typ: String(obj.typ) };
      }
    } catch {
      /* nächster Kandidat */
    }
  }

  return { parsed: null, typ: "chat" };
}
