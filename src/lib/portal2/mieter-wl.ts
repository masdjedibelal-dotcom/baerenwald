/**
 * Portal 2.0 D9 — Mieter-Weblink (mieterWLFrame) Copy & STG.
 * Texte 1:1 Mock `wl*` / `STG` (de+en). Server-Flows unberührt.
 */

import { MIETER_STG } from "@/lib/portal2/status";
import type { MeldeLang } from "@/lib/melden/melde-i18n";

export type MieterWlBrand = {
  name: string;
  sub?: string | null;
  logoUrl?: string | null;
  logoKuerzel?: string | null;
  primary?: string | null;
  primaryDk?: string | null;
  soft?: string | null;
  tel?: string | null;
  mail?: string | null;
};

/** Mock `wlFehler` */
export const MIETER_WL_FEHLER = {
  title_de: "Link nicht verfügbar",
  title_en: "Link unavailable",
  body_de:
    "Dieser Melde-Link ist ungültig oder wurde deaktiviert. Bitte wenden Sie sich an Ihre Hausverwaltung.",
  body_en:
    "This report link is invalid or has been disabled. Please contact your property manager.",
  btn_de: "Zur Objektauswahl",
  btn_en: "Back to selection",
} as const;

/** Mock `wlObjekt` Intro */
export const MIETER_WL_OBJEKT = {
  title_de: "Schaden melden",
  title_en: "Report an issue",
  sub_de: "Bitte wählen Sie zunächst das betroffene Gebäude.",
  sub_en: "Please select the affected building first.",
} as const;

/** Mock `wlBestaetigung` — Spec: Status-Link statt Mail-Satz */
export const MIETER_WL_BESTAETIGUNG = {
  title_de: "Meldung eingegangen",
  title_en: "Report received",
  /** Mock-Anfang ohne E-Mail-Satz; Spec TEIL C / D9 */
  body_suffix_de: " hat Ihre Meldung erhalten und prüft sie.",
  body_suffix_en: " has received your report and is reviewing it.",
  status_hint_de:
    "Es wird keine Bestätigungs-E-Mail versendet — bitte Status-Link speichern.",
  status_hint_en:
    "No confirmation email will be sent — please save your status link.",
  ref_de: "Referenznummer",
  ref_en: "Reference",
  track_de: "Status verfolgen",
  track_en: "Track status",
  copy_de: "Link kopieren",
  copy_en: "Copy link",
  copied_de: "Kopiert",
  copied_en: "Copied",
} as const;

/** Mock `wlStatus` Kopf */
export const MIETER_WL_STATUS = {
  title_de: "Status Ihrer Meldung",
  title_en: "Your report status",
  hello_de: "Hallo ",
  hello_en: "Hello ",
  keep_updated_de: " hält Sie hier auf dem Laufenden.",
  keep_updated_en: " will keep you updated here.",
} as const;

/** Mock `wlFooter` */
export const MIETER_WL_FOOTER = {
  contact_prefix_de: "Bei Rückfragen erreichen Sie ",
  contact_prefix_en: "For questions, contact ",
  noreply_de: "Diese Nachricht kann nicht beantwortet werden.",
  noreply_en: "This message cannot be replied to.",
} as const;

export function mieterWlT(
  lang: MeldeLang,
  pair: { de: string; en: string }
): string {
  return lang === "en" ? pair.en : pair.de;
}

export function mieterWlLogoLetter(brand: MieterWlBrand): string {
  const k = brand.logoKuerzel?.trim();
  if (k) return k.slice(0, 4).toUpperCase();
  const n = brand.name.trim();
  if (!n) return "HV";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

/** Mock Footer-Zeile: `Bei Rückfragen erreichen Sie {name} · {tel} · {mail}.` */
export function formatMieterWlFooterContact(
  brand: MieterWlBrand,
  lang: MeldeLang
): string {
  const name = brand.name.trim() || "Ihre Hausverwaltung";
  const parts = [name];
  if (brand.tel?.trim()) parts.push(brand.tel.trim());
  if (brand.mail?.trim()) parts.push(brand.mail.trim());
  const joined = parts.join(" · ");
  if (lang === "en") {
    return `${MIETER_WL_FOOTER.contact_prefix_en}${joined}.`;
  }
  return `${MIETER_WL_FOOTER.contact_prefix_de}${joined}.`;
}

export function mieterWlFooterNoreply(lang: MeldeLang): string {
  return lang === "en"
    ? MIETER_WL_FOOTER.noreply_en
    : MIETER_WL_FOOTER.noreply_de;
}

export type MieterStgStepView = {
  id: (typeof MIETER_STG)[number]["id"];
  title: string;
  subtitle: string;
  done: boolean;
  active: boolean;
};

/** STG-Timeline mit Subtiteln (nur aktiver Schritt zeigt Subtitle — Mock). */
export function buildMieterStgTimeline(
  stufe: string,
  lang: MeldeLang
): MieterStgStepView[] {
  const order = MIETER_STG.map((s) => s.id);
  const norm = stufe.toLowerCase().replace(/[\s-]+/g, "_");
  let idx = order.indexOf(norm as (typeof order)[number]);
  if (idx < 0) idx = 0;

  return MIETER_STG.map((s, i) => ({
    id: s.id,
    title: lang === "en" ? s.title_en : s.title_de,
    subtitle: lang === "en" ? s.subtitle_en : s.subtitle_de,
    done: i < idx,
    active: i === idx,
  }));
}

export function mieterStgActiveCopy(
  stufe: string,
  lang: MeldeLang
): { title: string; subtitle: string } {
  const steps = buildMieterStgTimeline(stufe, lang);
  const active = steps.find((s) => s.active) ?? steps[steps.length - 1]!;
  return { title: active.title, subtitle: active.subtitle };
}

/** Format „Eingegangen — Subtitle“ (Spec-Schreibweise). */
export function formatMieterStgHeadline(
  stufe: string,
  lang: MeldeLang
): string {
  const { title, subtitle } = mieterStgActiveCopy(stufe, lang);
  return `${title} — ${subtitle}`;
}
