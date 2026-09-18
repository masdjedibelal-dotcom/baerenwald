export type GptLeadDraft = {
  name?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  email?: string;
  telefon?: string;
  notizen?: string;
  /** Nutzer hat optional-Frage beantwortet (auch mit „nein“). */
  notizen_bekannt?: boolean;
};

export type GptLeadField = "name" | "strasse" | "plz" | "kontakt" | "notizen";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function looksLikePhone(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 6;
}

export function mergeLeadDraft(draft: GptLeadDraft, patch: Partial<GptLeadDraft>): GptLeadDraft {
  return { ...draft, ...patch };
}

export function extractLeadForField(text: string, field: GptLeadField): Partial<GptLeadDraft> {
  const t = text.trim();
  if (!t) return {};

  switch (field) {
    case "name":
      return { name: t };
    case "strasse": {
      const m = t.match(/^(.+?)\s+(\d+\s*[a-zA-Z]?)$/);
      if (m) return { strasse: m[1].trim(), hausnummer: m[2].trim() };
      return { strasse: t };
    }
    case "plz": {
      const plz = t.match(/\b(\d{5})\b/)?.[1];
      return plz ? { plz } : { plz: t.replace(/\D/g, "").slice(0, 5) };
    }
    case "kontakt": {
      if (isValidEmail(t)) return { email: t.toLowerCase() };
      if (looksLikePhone(t)) return { telefon: t };
      if (t.includes("@")) return { email: t.toLowerCase() };
      return { telefon: t };
    }
    case "notizen":
      if (/^(nein|nö|nope|passt|nichts|alles\s+klar|ok\.?)$/i.test(t)) {
        return { notizen: "", notizen_bekannt: true };
      }
      return { notizen: t, notizen_bekannt: true };
    default:
      return {};
  }
}

export function nextLeadField(draft: GptLeadDraft): GptLeadField | null {
  if (!draft.name?.trim()) return "name";
  if (!draft.strasse?.trim()) return "strasse";
  if (!draft.plz?.trim() || draft.plz.length < 5) return "plz";
  if (!draft.email?.trim() && !draft.telefon?.trim()) return "kontakt";
  if (!draft.notizen_bekannt) return "notizen";
  return null;
}

export function isLeadDraftComplete(draft: GptLeadDraft): boolean {
  return nextLeadField(draft) === null;
}

export function leadFieldLabel(field: GptLeadField): string {
  switch (field) {
    case "name":
      return "Name";
    case "strasse":
      return "Adresse";
    case "plz":
      return "PLZ";
    case "kontakt":
      return "E-Mail oder Telefon";
    case "notizen":
      return "Anmerkungen";
    default:
      return field;
  }
}

export function buildLeadQuestion(field: GptLeadField): string {
  switch (field) {
    case "name":
      return "Gerne nehme ich Ihr Projekt direkt hier auf. Wie ist Ihr **Name**?";
    case "strasse":
      return "Danke! Wie lautet Ihre **Adresse** — Straße und Hausnummer?";
    case "plz":
      return "Und Ihre **Postleitzahl**?";
    case "kontakt":
      return "Wie erreichen wir Sie am besten — **E-Mail oder Telefonnummer**?";
    case "notizen":
      return "Möchten Sie uns noch etwas mitteilen? (Optional — einfach „nein“ schreiben, wenn nichts dazu ist.)";
    default:
      return "Wie kann ich Ihnen helfen?";
  }
}

export function formatLeadDraftSummary(draft: GptLeadDraft): string {
  const lines = [
    draft.name && `**Name:** ${draft.name}`,
    draft.strasse &&
      `**Adresse:** ${draft.strasse}${draft.hausnummer ? ` ${draft.hausnummer}` : ""}`,
    draft.plz && `**PLZ:** ${draft.plz}`,
    draft.email && `**E-Mail:** ${draft.email}`,
    draft.telefon && `**Telefon:** ${draft.telefon}`,
    draft.notizen?.trim() && `**Anmerkung:** ${draft.notizen.trim()}`,
  ].filter(Boolean);
  return lines.join("\n");
}
