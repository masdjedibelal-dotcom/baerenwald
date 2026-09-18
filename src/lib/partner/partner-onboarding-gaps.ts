/**
 * Partner-Onboarding: Handwerkskarte + Firmendaten für Angebot/Rechnung.
 */

import { HANDWERKSKARTE_TYP_SLUG } from "@/lib/partner/compliance-summary";
import type {
  PartnerHandwerkerProfil,
  PartnerProfilKontext,
} from "@/lib/partner/get-partner-data";
import { checkPartnerFirmendatenGate } from "@/lib/partner/partner-firmendaten-gate";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";
import type { EinstellungenTabId } from "@/lib/portal2/einstellungen-nav";

const UPLOADED_STATUSES = new Set([
  "erledigt",
  "in_pruefung",
  "ablauf_warnung",
]);

export function isHandwerkskarteHochgeladen(
  items: PartnerComplianceItem[]
): boolean {
  const card = items.find((i) => i.slug === HANDWERKSKARTE_TYP_SLUG);
  if (!card) return false;
  return UPLOADED_STATUSES.has(card.status);
}

export type PartnerOnboardingGaps = {
  handwerkskarteFehlt: boolean;
  firmendatenFehlen: boolean;
  missingFirmendaten: string[];
  /** true wenn Banner relevant (mindestens eine Lücke). */
  show: boolean;
  preferredTab: EinstellungenTabId;
};

export function resolvePartnerOnboardingGaps(input: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}): PartnerOnboardingGaps {
  const handwerkskarteFehlt = !isHandwerkskarteHochgeladen(input.profil.stamm);
  const gate = checkPartnerFirmendatenGate({
    firma: input.handwerker.firma,
    name: input.handwerker.name,
    strasse: input.handwerker.strasse,
    hausnummer: input.handwerker.hausnummer,
    plz: input.handwerker.plz,
    ort: input.handwerker.ort,
    adresse: input.handwerker.adresse,
    telefon: input.handwerker.telefon,
    steuernummer: input.handwerker.steuernummer,
    ustid: input.handwerker.ustid,
    iban: input.handwerker.iban,
  });
  const firmendatenFehlen = !gate.okRechnung;
  const missingFirmendaten = gate.missingRechnung;

  let preferredTab: EinstellungenTabId = "anschrift";
  if (handwerkskarteFehlt) preferredTab = "stamm";
  else if (firmendatenFehlen) preferredTab = "anschrift";

  return {
    handwerkskarteFehlt,
    firmendatenFehlen,
    missingFirmendaten,
    show: handwerkskarteFehlt || firmendatenFehlen,
    preferredTab,
  };
}

export const PARTNER_ONBOARDING_BANNER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export function partnerOnboardingBannerStorageKey(email: string | null): string {
  const id = (email ?? "default").trim().toLowerCase() || "default";
  return `bw_partner_onboarding_banner_dismissed_at:${id}`;
}

export function isPartnerOnboardingBannerDismissed(
  email: string | null,
  now = Date.now()
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(partnerOnboardingBannerStorageKey(email));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return now - ts < PARTNER_ONBOARDING_BANNER_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function dismissPartnerOnboardingBanner(email: string | null): void {
  try {
    localStorage.setItem(
      partnerOnboardingBannerStorageKey(email),
      String(Date.now())
    );
  } catch {
    /* ignore */
  }
}
