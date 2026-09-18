/**
 * Fokus-Karten-Copy je Rolle (Deep Green `04-screens.md`).
 * Titel/Beträge kommen aus echten Daten; Label-Texte sind verbindlich.
 */

import type { PortalDashboardFocus } from "@/components/shared/PortalDashboardFocusCard";

export type PortalFocusRole =
  | "hv"
  | "mieter"
  | "privat"
  | "eigentuemer"
  | "hausmeister"
  | "handwerker";

type FocusSeed = {
  title: string;
  subtitle?: string | null;
  onOpen?: () => void;
  /** Betrag formatiert, falls vorhanden */
  amountValue?: string | null;
  /** Datum/Frist als Text, falls Betrag nicht passt (Handwerker) */
  amountAsText?: string | null;
};

const PROGRESS_MIETER = ["Eingegangen", "Prüfung", "Termin", "Erledigt"] as const;
const PROGRESS_HM = ["Erhalten", "Vor Ort", "Befund", "Übergeben"] as const;

export function buildPortalDashboardFocus(
  role: PortalFocusRole,
  seed: FocusSeed | null | undefined
): PortalDashboardFocus | null {
  if (!seed?.title?.trim()) return null;
  const title = seed.title.trim();
  const onOpen = seed.onOpen;
  const openBtn = onOpen ? { onOpen } : {};

  switch (role) {
    case "hv":
      return {
        kicker: "Freigabe nötig",
        kickerTone: "sand",
        title,
        subtitle: seed.subtitle,
        amount: seed.amountValue
          ? { label: "Angebotssumme", value: seed.amountValue }
          : undefined,
        note: "Über Ihrer Freigabeschwelle von 1.000 € — Ihre Freigabe ist nötig.",
        noteTone: "warn",
        buttons: [
          { label: "Ablehnen", variant: "secondary", onClick: onOpen },
          { label: "Freigeben", variant: "primary", onClick: onOpen },
        ],
        ...openBtn,
      };
    case "mieter":
      return {
        kicker: "Aktuelle Meldung",
        kickerTone: "green",
        title,
        subtitle: seed.subtitle,
        progress: { labels: [...PROGRESS_MIETER], activeStep: 0 },
        note: "Ihre Verwaltung prüft die Meldung. Sie werden benachrichtigt, sobald ein Termin steht — Kosten entstehen Ihnen nicht.",
        ...openBtn,
      };
    case "privat":
      return {
        kicker: "Angebot liegt vor",
        kickerTone: "sand",
        title,
        subtitle: seed.subtitle,
        amount: seed.amountValue
          ? { label: "Angebotssumme brutto", value: seed.amountValue }
          : undefined,
        note: "Preisrahmen aus dem Rechner: 17.500 – 21.000 €. Ein Ansprechpartner für alle Gewerke.",
        noteTone: "warn",
        buttons: [
          { label: "Rückfrage", variant: "secondary", onClick: onOpen },
          { label: "Annehmen", variant: "primary", onClick: onOpen },
        ],
        ...openBtn,
      };
    case "eigentuemer":
      return {
        kicker: "Kostenfreigabe nötig",
        kickerTone: "sand",
        title,
        subtitle: seed.subtitle,
        amount: seed.amountValue
          ? { label: "Angebotssumme", value: seed.amountValue }
          : undefined,
        note: "Überschreitet Ihren Schwellenwert (500 €). Die Verwaltung hat das Angebot geprüft.",
        noteTone: "warn",
        buttons: [
          { label: "Ablehnen", variant: "secondary", onClick: onOpen },
          { label: "Kosten freigeben", variant: "primary", onClick: onOpen },
        ],
        ...openBtn,
      };
    case "hausmeister":
      return {
        kicker: "Prüfauftrag offen",
        kickerTone: "green",
        title,
        subtitle: seed.subtitle,
        progress: { labels: [...PROGRESS_HM], activeStep: 1 },
        note: "Termin mit Mieterin: 13.08. 09:00. Ursache dokumentieren und Fotos hinterlegen.",
        buttons: [
          { label: "Angebot einholen", variant: "secondary", onClick: onOpen },
          { label: "Befund senden", variant: "primary", onClick: onOpen },
        ],
        ...openBtn,
      };
    case "handwerker":
      return {
        kicker: "Angebot gefordert",
        kickerTone: "sand",
        title: title.startsWith("Anfrage:") ? title : `Anfrage: ${title}`,
        subtitle: seed.subtitle,
        amount:
          seed.amountAsText || seed.amountValue
            ? {
                label: "Frist für Ihr Angebot",
                value: seed.amountAsText || seed.amountValue || "",
              }
            : undefined,
        note: "Vorbefund Hausmeister: Umwälzpumpe läuft nicht an. Kalkulation mit Ihren Rahmenvertrags-Konditionen.",
        noteTone: "warn",
        buttons: [
          { label: "Ablehnen", variant: "secondary", onClick: onOpen },
          { label: "Angebot abgeben", variant: "primary", onClick: onOpen },
        ],
        ...openBtn,
      };
    default:
      return null;
  }
}
