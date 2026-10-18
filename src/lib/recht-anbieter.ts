import { SITE_CONFIG } from "@/lib/config";
import { istTeo, MARKE } from "@/lib/marke";

/** Anbieter-Angaben für Impressum, Datenschutz und AGB — aus der Marken-Datei. */
export const ANBIETER = {
  name: MARKE.firma.inhaber,
  rechtsform: istTeo ? "Gesellschaft bürgerlichen Rechts (GbR)" : "Einzelunternehmen",
  /** Nur GbR: vertretungsberechtigte Gesellschafter */
  vertreten: istTeo ? "Belal Masdjedi, Beran Cakmak" : null,
  strasse: `${MARKE.firma.strasse} ${MARKE.firma.hausnummer}`,
  ortZeile: `${MARKE.firma.plz} ${MARKE.firma.ort}`,
  email: MARKE.firma.email,
  /** TEO: eigene Nummer steht noch aus — bis dahin keine Bärenwald-Nummer zeigen */
  telefon: istTeo ? null : { anzeige: SITE_CONFIG.phone, href: SITE_CONFIG.phoneHref },
  mobil: istTeo ? null : { anzeige: SITE_CONFIG.phoneMobil, href: SITE_CONFIG.phoneMobilHref },
} as const;
