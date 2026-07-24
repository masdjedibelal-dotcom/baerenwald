import { capturePostHogEvent } from "@/lib/consent/posthog-client";
import { recordMarketingClick } from "@/lib/marketing/journey-storage";

/** Kurzlabel für Lead-/Preis-Events (Situation + Gewerke). */
export function formatTrackLeistung(
  situation: string | null | undefined,
  bereiche: string[]
): string {
  const b = bereiche.filter(Boolean).join(", ");
  const s = situation?.trim() || "";
  if (s && b) return `${s}:${b}`;
  return s || b || "—";
}

function ph(
  event: string,
  props?: Record<string, string | number | undefined>
): void {
  capturePostHogEvent(event, props);
}

export const track = {
  rechnerStart: (leistung?: string) => {
    if (leistung) recordMarketingClick("rechner_start", leistung, "/rechner");
    ph("rechner_start", { leistung });
  },

  leistungGewaehlt: (leistung: string, situation: string) => {
    recordMarketingClick("leistung_gewaehlt", `${situation}: ${leistung}`);
    ph("leistung_gewaehlt", { leistung, situation });
  },

  rechnerSchritt: (schritt: number, name: string) => {
    ph("rechner_schritt", { schritt_nummer: schritt, schritt_name: name });
  },

  preisAngezeigt: (
    leistung: string,
    preis_min?: number,
    preis_max?: number
  ) => {
    recordMarketingClick(
      "preis_angezeigt",
      `${leistung} (${preis_min ?? "?"}–${preis_max ?? "?"} €)`
    );
    ph("preis_angezeigt", { leistung, preis_min, preis_max });
  },

  leadAbgeschickt: (leistung: string) => {
    recordMarketingClick("lead_abgeschickt", leistung);
    ph("lead_abgeschickt", { leistung });
  },

  preisPerMail: (leistung: string) => {
    recordMarketingClick("preis_per_mail", leistung);
    ph("preis_per_mail", { leistung });
  },

  heroChipKlick: (leistung: string) => {
    recordMarketingClick("hero_chip", leistung, `/rechner?leistung=${leistung}`);
    ph("hero_chip_klick", { leistung });
  },

  abbruch: (schritt: string, leistung?: string) => {
    ph("funnel_abbruch", { schritt, leistung });
  },

  /** Produkt-Katalog: Paket gewählt (Landing, Leistung, Portal, Karussell). */
  produktGewaehlt: (
    produktSlug: string,
    leistungSlug: string,
    quelle: string
  ) => {
    recordMarketingClick("produkt_gewaehlt", `${quelle}: ${produktSlug}`, produktSlug);
    ph("produkt_gewaehlt", {
      produkt: produktSlug,
      leistung: leistungSlug,
      quelle,
    });
  },

  /** Leistungskarte / Link auf der Website */
  leistungLink: (label: string, href: string) => {
    recordMarketingClick("leistung_link", label, href);
    ph("leistung_link_click", { label, href });
  },

  checkoutModalOpen: (produktSlug: string, quelle: string) => {
    recordMarketingClick("checkout_modal_open", `${quelle}: ${produktSlug}`);
    ph("checkout_modal_open", { produkt: produktSlug, quelle });
  },

  konverterGroesseChange: (
    familie: string,
    groesse: string,
    quelle: string
  ) => {
    ph("konverter_groesse_change", { familie, groesse, quelle });
  },

  konverterMatrixTier: (
    familie: string,
    tier: string,
    quelle: string
  ) => {
    ph("konverter_matrix_tier", { familie, tier, quelle });
  },

  konverterMatrixView: (familie: string, quelle: string) => {
    ph("konverter_matrix_view", { familie, quelle });
  },

  meldeLinkGeoeffnet: (orgKennung: string, objektSlug?: string) => {
    ph("melde_link_geoeffnet", { org: orgKennung, objekt: objektSlug });
  },

  meldeAbgeschickt: (kategorie: string, orgKennung: string) => {
    ph("melde_abgeschickt", { kategorie, org: orgKennung });
  },

  orgPortalTab: (tab: string) => {
    ph("org_portal_tab", { tab });
  },

  orgAnfrageGestartet: (anlass: string) => {
    ph("org_anfrage_gestartet", { anlass });
  },

  orgFreigabe: (aktion: "freigegeben" | "abgelehnt") => {
    ph("org_freigabe", { aktion });
  },
};

const TRUST_ORDER = [
  "trust_intro",
  "trust_preis",
  "trust_qualitaet",
] as const;

const BW_SCREEN_STEP_LABELS: Record<string, string> = {
  trust_intro: "Trust — Einstieg",
  trust_preis: "Trust — Preis",
  trust_qualitaet: "Trust — Qualität",
  situation: "Situation",
  bereiche: "Bereich / Gewerk",
  umfang: "Umfang",
  zeitpunkt: "Zeitpunkt",
  zugaenglichkeit: "Zugänglichkeit",
  zustand: "Zustand",
  groesse: "Größe / Fläche",
  bad_ausstattung: "Bad — Ausstattung",
  ort: "PLZ / Ort",
  loading: "Preisberechnung",
  result: "Ergebnis",
  lead: "Kontakt",
  "beratung-lead": "Beratungsanfrage",
  ausserhalb: "Außerhalb Einzugsgebiet",
  danke: "Danke",
};

const TAIL_SCREENS = [
  "loading",
  "result",
  "lead",
  "beratung-lead",
  "ausserhalb",
  "danke",
] as const;

/** Fortlaufende Schrittnummer + lesbarer Name für PostHog-Funnel. */
export function bwRechnerSchrittForPosthog(
  screen: string,
  stepSequence: readonly string[]
): { schritt: number; schrittName: string } {
  const schrittName =
    BW_SCREEN_STEP_LABELS[screen] ??
    screen.replace(/_/g, " ").replace(/-/g, " ");

  const ti = TRUST_ORDER.indexOf(screen as (typeof TRUST_ORDER)[number]);
  if (ti >= 0) {
    return { schritt: ti + 1, schrittName };
  }

  const si = stepSequence.indexOf(screen);
  if (si >= 0) {
    return { schritt: TRUST_ORDER.length + si + 1, schrittName };
  }

  const ui = TAIL_SCREENS.indexOf(screen as (typeof TAIL_SCREENS)[number]);
  if (ui >= 0) {
    return {
      schritt: TRUST_ORDER.length + stepSequence.length + ui + 1,
      schrittName,
    };
  }

  return {
    schritt: TRUST_ORDER.length + stepSequence.length + TAIL_SCREENS.length + 1,
    schrittName,
  };
}
