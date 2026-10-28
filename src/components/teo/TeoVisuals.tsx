/**
 * Servus TEO Website: gestaltete Produkt-Ansichten (keine Screenshots).
 * Reine Darstellung, Inhalte sind Beispiele. Styles in teo-start.css (ts-*).
 */
import {
  Building2,
  Check,
  Droplets,
  Flame,
  Wrench,
  X,
  Zap,
} from "lucide-react";

type Ton = "neu" | "warten" | "teo" | "termin" | "fertig";

export function Status({ ton, children }: { ton: Ton; children: string }) {
  return <span className={`ts-status ts-status--${ton}`}>{children}</span>;
}

/** QR-ähnliches Muster (deterministisch, nur Optik). */
/* ───────────── Handy (Rollen) ───────────── */


/** Team-App: Heute mit Checkliste. */
export function HandyTeamApp() {
  return (
    <div className="ts-handy__screen">
      <div className="ts-handy__kopf">
        <span className="ts-handy__marke">t.</span>
        <span>
          <b>Heute</b>
          <small>Leopoldstr. 10</small>
        </span>
      </div>
      <div className="ts-handy__karte">
        <b>Treppenhaus reinigen</b>
        <small>Wöchentlich · fällig heute</small>
        <ul className="ts-check">
          <li>
            <span>Treppen gewischt</span>
            <i className="ja">
              <Check size={12} strokeWidth={3} />
            </i>
          </li>
          <li>
            <span>Geländer</span>
            <i className="ja">
              <Check size={12} strokeWidth={3} />
            </i>
          </li>
          <li className="ist-mangel">
            <span>Licht 2. OG</span>
            <i className="nein">
              <X size={12} strokeWidth={3} />
            </i>
          </li>
        </ul>
        <span className="ts-handy__knopf">Erledigt · 1 melden</span>
      </div>
      <div className="ts-handy__karte ts-handy__karte--klein">
        <b>Mülltonnen raus</b>
        <small>Morgen</small>
      </div>
      <div className="ts-handy__nav">
        <span className="ist-aktiv">Heute</span>
        <span>Pläne</span>
        <span>Melden</span>
      </div>
    </div>
  );
}

/** Mieter: Melde-Link mit Mitteilung. */
export function HandyMieter() {
  return (
    <div className="ts-handy__screen ts-handy__screen--hell">
      <div className="ts-handy__org">
        <span className="ts-handy__org-logo">MV</span>
        <span>
          <b>Musterverwaltung</b>
          <small>Leopoldstr. 10</small>
        </span>
      </div>
      <div className="ts-mitteilung">
        <small>Mitteilung · 2. Nov.</small>
        <b>Wasser am 5.11. von 9 bis 12 Uhr abgestellt</b>
      </div>
      <b className="ts-handy__frage">Was ist betroffen?</b>
      <div className="ts-optionen">
        <span className="ist-aktiv">
          <Droplets size={15} /> Wasser / Rohr / WC
        </span>
        <span>
          <Flame size={15} /> Heizung
        </span>
        <span>
          <Zap size={15} /> Strom
        </span>
        <span>
          <Wrench size={15} /> Sonstiges
        </span>
      </div>
      <span className="ts-handy__knopf ts-handy__knopf--org">Weiter</span>
    </div>
  );
}


/* ───────────── Rollen ───────────── */

export function RolleVerwaltung() {
  return (
    <div className="ts-karte ts-objekt" aria-hidden="true">
      <div className="ts-objekt__kopf">
        <span className="ts-objekt__icon">
          <Building2 size={18} />
        </span>
        <span>
          <b>WEG Leopoldstraße 10</b>
          <small>24 Einheiten · Zuständig: Frau Berger</small>
        </span>
      </div>
      <div className="ts-objekt__budget">
        <span>
          <small>Beauftragt 2026</small>
          <b>12.400 €</b>
        </span>
        <span>
          <small>Budget</small>
          <b>20.000 €</b>
        </span>
      </div>
      <div className="ts-balken">
        <span className="ts-balken__wert ts-balken__wert--62" />
      </div>
      <ul className="ts-liste ts-liste--kompakt">
        <li>
          <span className="ts-liste__text">
            <b>Heizung fällt aus</b>
            <small>Angebot 1.840 €</small>
          </span>
          <span className="ts-knopf-gruen">Freigeben</span>
        </li>
        <li>
          <span className="ts-liste__text">
            <b>Rauchmelder Prüfung</b>
            <small>Prüffrist 12.11.</small>
          </span>
          <Status ton="teo">Bei TEO</Status>
        </li>
        <li>
          <span className="ts-liste__text">
            <b>Klingelanlage</b>
            <small>WE 12</small>
          </span>
          <Status ton="termin">Termin</Status>
        </li>
      </ul>
    </div>
  );
}

export function RolleEigentuemer() {
  return (
    <div className="ts-karte ts-mein" aria-hidden="true">
      <div className="ts-handy__org">
        <span className="ts-handy__org-logo">MV</span>
        <span>
          <b>Mein Objekt</b>
          <small>WEG Leopoldstraße 10</small>
        </span>
      </div>
      <div className="ts-objekt__budget">
        <span>
          <small>Beauftragt 2026</small>
          <b>12.400 €</b>
        </span>
        <span>
          <small>Budget</small>
          <b>20.000 €</b>
        </span>
      </div>
      <ul className="ts-liste ts-liste--kompakt">
        <li>
          <span className="ts-liste__text">
            <b>Fassade Nordseite</b>
            <small>Beschluss liegt vor</small>
          </span>
          <Status ton="teo">Beauftragt</Status>
        </li>
        <li>
          <span className="ts-liste__text">
            <b>Treppenhaus gereinigt</b>
            <small>Zuletzt gestern</small>
          </span>
          <Status ton="fertig">Erledigt</Status>
        </li>
        <li>
          <span className="ts-liste__text">
            <b>Aufzug Hauptprüfung</b>
            <small>Fällig 03.02.</small>
          </span>
          <Status ton="termin">Geplant</Status>
        </li>
      </ul>
    </div>
  );
}




