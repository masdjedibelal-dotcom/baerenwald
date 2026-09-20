import type { PortalFunnelMidStepId } from "@/lib/funnel/portal-funnel-mid-steps";
import type { FunnelChannel } from "@/lib/funnel/funnel-variant";

export type PortalFunnelObjekt = {
  id: string;
  titel: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  melde_slug?: string | null;
  /** Optional: Einheiten für SE-Gate / Auswahl (Eigentümer-Portal). */
  einheiten?: Array<{ id: string; label: string; etage?: string | null }>;
};

export type PortalFunnelMeldeCtx = {
  orgKennung: string;
  objektSlug: string;
  orgName: string;
  sessionKey: string;
  /** Einladung ergänzen statt neuer Meldung */
  ergaenzenToken?: string;
  /** Kein oder unvollständiges Objekt → Adresse im Kontaktschritt (immer für Melde-Link) */
  needsAddress?: boolean;
  /** Zurück darf nicht zur HV-Objektliste führen */
  objektLocked?: boolean;
  /** Anzeige in der Zusammenfassung */
  objektTitel?: string | null;
  objektAdresse?: string | null;
  /** Rechtslinks: Verwaltung (nicht Website-Bärenwald) */
  datenschutzHref?: string;
  impressumHref?: string;
  /** HV-Whitelist Sofortmaßnahme; leer = nichts geht direkt (UI). */
  akutFallIds?: readonly string[];
};

export type PortalFunnelPrefill = {
  name?: string;
  email?: string;
  telefon?: string;
  objektId?: string;
  einheit?: string;
  plz?: string;
  strasse?: string;
  hausnummer?: string;
  ort?: string;
};

export type HvMieterOption = {
  id: string;
  name: string;
  email?: string | null;
  telefon?: string | null;
  einheitLabel?: string | null;
};

export type PortalFunnelStepId =
  | "objekt"
  | "objekt_neu"
  | "mieter"
  | "mieter_neu"
  | "situation"
  | "bereiche"
  | "dringlichkeit"
  | "fachdetail"
  | "groesse"
  | PortalFunnelMidStepId
  | "medien"
  | "beschreibung"
  | "kontakt"
  | "result";

export type PortalFunnelHostProps = {
  channel: FunnelChannel;
  title?: string;
  objekte?: PortalFunnelObjekt[];
  prefill?: PortalFunnelPrefill;
  /** Anonymer Melde-Kontext (Submit → /api/meldung). */
  melde?: PortalFunnelMeldeCtx;
  onClose: () => void;
  onDone: () => void;
  /** Nach Objekt-Neuanlage (HV) — Parent kann Liste refreshen. */
  onObjekteChanged?: (objekte: PortalFunnelObjekt[]) => void;
  /**
   * `modal` = Portal-Create (kompakte Steps, füllt Modal).
   * `page` = Melde-Seite (wie Rechner-Abstand).
   */
  layout?: "modal" | "page";
};

export type SummaryRow = { label: string; value: string };
