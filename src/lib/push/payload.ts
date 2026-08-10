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

/**
 * OS-Push-Payload aus In-App-Notification.
 * Angebot: feste Copy ohne Preise.
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
      title: PUSH_COPY.angebotLiegtVor.title,
      body: PUSH_COPY.angebotLiegtVor.body,
      url,
      tag: "angebot",
    };
  }

  if (typ === "freigabe" || typ.includes("freigabe")) {
    return {
      title: PUSH_COPY.freigabeNoetig.title,
      body: PUSH_COPY.freigabeNoetig.body,
      url,
      tag: "freigabe",
    };
  }

  if (
    typ === "neue_meldung" ||
    typ === "auftrag" ||
    typ.includes("meldung") ||
    typ.includes("zuweisung")
  ) {
    const title = stripPricesFromPushText(
      input.titel?.trim() || PUSH_COPY.neuerVorgang.title
    );
    const body = stripPricesFromPushText(
      input.body?.trim() || PUSH_COPY.neuerVorgang.body
    );
    return {
      title: title || PUSH_COPY.neuerVorgang.title,
      body: body || PUSH_COPY.neuerVorgang.body,
      url,
      tag: typ || "vorgang",
    };
  }

  return {
    title: stripPricesFromPushText(
      input.titel?.trim() || PUSH_COPY.neuerVorgang.title
    ) || PUSH_COPY.neuerVorgang.title,
    body: stripPricesFromPushText(
      input.body?.trim() || PUSH_COPY.neuerVorgang.body
    ) || PUSH_COPY.neuerVorgang.body,
    url,
    tag: typ || "info",
  };
}
