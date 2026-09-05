import { PUSH_COPY, type PushPayload } from "@/lib/push/types";

/** Entfernt Preishinweise aus Push-Bodies (Fallback). */
export function stripPricesFromPushText(text: string): string {
  return text
    .replace(
      /\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s*(?:€|EUR|Euro)\b/gi,
      ""
    )
    .replace(/\b(?:€|EUR)\s*\d[\d.,\s]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function composePushBody(
  titel: string | null | undefined,
  body: string | null | undefined,
  fallback: string
): string {
  const t = stripPricesFromPushText(String(titel ?? "").trim());
  const b = stripPricesFromPushText(String(body ?? "").trim());
  if (t && b) {
    if (b.toLowerCase().startsWith(t.toLowerCase())) return b;
    return `${t} — ${b}`;
  }
  return t || b || fallback;
}

/**
 * OS-Push: Titel leer — Manifest/PWA liefert den App-Namen.
 * (Sonst Safari/iOS: „Bärenwald from Bärenwald“.)
 * Inhalt nur im Body — nie Preise bei Angeboten.
 */
export function buildPushPayloadFromNotif(input: {
  typ?: string | null;
  titel?: string | null;
  body?: string | null;
  link?: string | null;
  defaultUrl?: string;
}): PushPayload {
  const typ = String(input.typ ?? "").toLowerCase();
  const url = (input.link?.trim() || input.defaultUrl || "/portal").trim();

  if (
    typ === "angebot" ||
    typ.includes("angebot") ||
    /angebot/i.test(String(input.titel ?? ""))
  ) {
    return {
      title: "",
      body: PUSH_COPY.angebotLiegtVor.body,
      url,
      tag: "angebot",
    };
  }

  if (typ === "freigabe" || typ.includes("freigabe")) {
    return {
      title: "",
      body: composePushBody(
        input.titel,
        input.body,
        PUSH_COPY.freigabeNoetig.body
      ),
      url,
      tag: "freigabe",
    };
  }

  if (
    typ === "neu" ||
    typ === "geaendert" ||
    typ === "zuweisung" ||
    typ === "bautagebuch" ||
    typ === "erinnerung"
  ) {
    return {
      title: "",
      body: composePushBody(
        input.titel,
        input.body,
        PUSH_COPY.neuerAuftrag.body
      ),
      url,
      tag: typ || "partner",
    };
  }

  return {
    title: "",
    body: composePushBody(
      input.titel,
      input.body,
      PUSH_COPY.neuerVorgang.body
    ),
    url,
    tag: typ || "info",
  };
}
