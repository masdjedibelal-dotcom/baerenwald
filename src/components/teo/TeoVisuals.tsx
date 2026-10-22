/**
 * Servus TEO Website: gestaltete Produkt-Ansichten (keine Screenshots).
 * Reine Darstellung, Inhalte sind Beispiele. Styles in teo-start.css (ts-*).
 */
import {
  AlertTriangle,
  BadgeEuro,
  Bell,
  Building2,
  CalendarClock,
  Camera,
  Check,
  ClipboardCheck,
  Droplets,
  FileSpreadsheet,
  Flame,
  Home,
  MessageCircle,
  Megaphone,
  PhoneMissed,
  QrCode,
  Wrench,
  X,
  Zap,
} from "lucide-react";

type Ton = "neu" | "warten" | "teo" | "termin" | "fertig";

export function Status({ ton, children }: { ton: Ton; children: string }) {
  return <span className={`ts-status ts-status--${ton}`}>{children}</span>;
}

/** QR-ähnliches Muster (deterministisch, nur Optik). */
export function QrMuster({ groesse = 21 }: { groesse?: number }) {
  const zellen: Array<[number, number]> = [];
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= groesse - 7 && y < 7) || (x < 7 && y >= groesse - 7);
  for (let y = 0; y < groesse; y++) {
    for (let x = 0; x < groesse; x++) {
      if (finder(x, y)) {
        const lx = x >= groesse - 7 ? x - (groesse - 7) : x;
        const ly = y >= groesse - 7 ? y - (groesse - 7) : y;
        const rand = lx === 0 || ly === 0 || lx === 6 || ly === 6;
        const kern = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
        if (rand || kern) zellen.push([x, y]);
      } else if (((x * 7 + y * 13 + x * y) % 5) < 2) {
        zellen.push([x, y]);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${groesse} ${groesse}`} className="ts-qr" aria-hidden="true">
      {zellen.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  );
}

/* ───────────── Hero ───────────── */

const HERO_ZEILEN: Array<{ titel: string; ort: string; ton: Ton; status: string; betrag: string }> = [
  { titel: "Heizung fällt aus", ort: "Leopoldstr. 10 · WE 4", ton: "warten", status: "Zu entscheiden", betrag: "1.840 €" },
  { titel: "Rohrbruch Keller", ort: "Isarstr. 5", ton: "teo", status: "Bei TEO", betrag: "Akut" },
  { titel: "Klingelanlage defekt", ort: "Am Hof 2", ton: "termin", status: "Termin Do 9:00", betrag: "320 €" },
  { titel: "Rauchmelder Prüfung", ort: "Leopoldstr. 10", ton: "teo", status: "Bei TEO", betrag: "Plan" },
  { titel: "Dachrinne verstopft", ort: "Isarstr. 5", ton: "fertig", status: "Erledigt", betrag: "410 €" },
];

export function HeroVisual() {
  return (
    <div className="ts-hero-visual" aria-hidden="true">
      <div className="ts-fenster">
        <div className="ts-fenster__leiste">
          <span className="ts-punkte">
            <i />
            <i />
            <i />
          </span>
          <span className="ts-fenster__url">servus-teo.de/arbeitsplatz</span>
        </div>
        <div className="ts-fenster__body">
          <nav className="ts-seitenleiste">
            <span className="ts-seitenleiste__logo">t.</span>
            <Home size={16} />
            <ClipboardCheck size={16} className="ist-aktiv" />
            <Building2 size={16} />
            <CalendarClock size={16} />
          </nav>
          <div className="ts-app">
            <div className="ts-app__kopf">
              <strong>Vorgänge</strong>
              <span className="ts-app__knopf">+ Neuer Vorgang</span>
            </div>
            <div className="ts-chips">
              <span className="ist-aktiv">Alle 24</span>
              <span>Zu entscheiden 3</span>
              <span>Bei TEO 7</span>
              <span>Erledigt 14</span>
            </div>
            <ul className="ts-liste">
              {HERO_ZEILEN.map((z) => (
                <li key={z.titel}>
                  <span className="ts-liste__text">
                    <b>{z.titel}</b>
                    <small>{z.ort}</small>
                  </span>
                  <Status ton={z.ton}>{z.status}</Status>
                  <span className="ts-liste__betrag">{z.betrag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="ts-toast ts-schwebe">
        <span className="ts-toast__icon">
          <QrCode size={18} />
        </span>
        <span>
          <b>Neue Meldung per QR-Code</b>
          <small>Wasserfleck an der Decke · WE 7</small>
        </span>
        <em>jetzt</em>
      </div>

      <div className="ts-handy ts-handy--hero ts-schwebe ts-schwebe--spaet">
        <HandyTeamApp />
      </div>

      <div className="ts-freigabe ts-schwebe ts-schwebe--langsam">
        <div className="ts-freigabe__kopf">
          <Flame size={16} />
          <span>
            <b>Angebot Heizung</b>
            <small>Leopoldstr. 10</small>
          </span>
          <strong>1.840 €</strong>
        </div>
        <div className="ts-balken">
          <span className="ts-balken__wert ts-balken__wert--62" />
        </div>
        <small className="ts-freigabe__budget">Budget 2026: 12.400 € von 20.000 €</small>
        <div className="ts-freigabe__knoepfe">
          <span>Ablehnen</span>
          <span className="ist-gruen">Freigeben</span>
        </div>
      </div>
    </div>
  );
}

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

/* ───────────── Ablauf ───────────── */

export function AblaufKarte({ schritt }: { schritt: 1 | 2 | 3 | 4 }) {
  if (schritt === 1)
    return (
      <div className="ts-mini" aria-hidden="true">
        <div className="ts-mini__foto">
          <Droplets size={22} />
          <Camera size={14} className="ts-mini__kamera" />
        </div>
        <div className="ts-mini__zeile">
          <b>Wasserfleck Decke</b>
          <Status ton="neu">Neu</Status>
        </div>
        <small>WE 7 · per QR-Code · 17:42</small>
      </div>
    );
  if (schritt === 2)
    return (
      <div className="ts-mini" aria-hidden="true">
        <div className="ts-mini__termin">
          <span className="ts-mini__tag">
            <small>Di</small>
            <b>14</b>
          </span>
          <span>
            <b>Vor-Ort-Termin</b>
            <small>9:00 · Sanitär Huber</small>
          </span>
        </div>
        <div className="ts-mini__zeile">
          <small>Mieter informiert</small>
          <Status ton="termin">Termin</Status>
        </div>
      </div>
    );
  if (schritt === 3)
    return (
      <div className="ts-mini" aria-hidden="true">
        <div className="ts-mini__zeile">
          <b>Angebot</b>
          <strong className="ts-mini__betrag">640 €</strong>
        </div>
        <div className="ts-mini__grenze">
          <span>Unter Ihrer Wertgrenze von 800 €</span>
          <span className="ts-schalter" />
        </div>
        <div className="ts-mini__zeile">
          <small>Läuft direkt</small>
          <Status ton="teo">Bei TEO</Status>
        </div>
      </div>
    );
  return (
    <div className="ts-mini" aria-hidden="true">
      <div className="ts-mini__belege">
        <span>
          <Camera size={14} /> 3 Fotos
        </span>
        <span>
          <ClipboardCheck size={14} /> Abnahme
        </span>
        <span>
          <BadgeEuro size={14} /> Rechnung
        </span>
      </div>
      <div className="ts-mini__zeile">
        <small>Erledigt am 16. Nov.</small>
        <Status ton="fertig">Erledigt</Status>
      </div>
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

/* ───────────── Funktionen (Bento) ───────────── */

export function BentoFristen() {
  const zeilen: Array<{ titel: string; wann: string; ton: Ton; status: string }> = [
    { titel: "Rauchwarnmelder", wann: "12. Nov.", ton: "teo", status: "TEO beauftragt" },
    { titel: "Aufzug Hauptprüfung", wann: "3. Feb.", ton: "termin", status: "Geplant" },
    { titel: "Trinkwasser Legionellen", wann: "2027", ton: "termin", status: "Geplant" },
    { titel: "Heizungswartung", wann: "erledigt", ton: "fertig", status: "Nachweis" },
  ];
  return (
    <ul className="ts-fristen" aria-hidden="true">
      {zeilen.map((z) => (
        <li key={z.titel}>
          <CalendarClock size={15} />
          <b>{z.titel}</b>
          <small>{z.wann}</small>
          <Status ton={z.ton}>{z.status}</Status>
        </li>
      ))}
    </ul>
  );
}

export function BentoAushang() {
  return (
    <div className="ts-aushang" aria-hidden="true">
      <small>Musterverwaltung</small>
      <b>Schaden im Haus?</b>
      <QrMuster />
      <small>Scannen und melden</small>
    </div>
  );
}

export function BentoGrenze() {
  return (
    <div className="ts-grenze" aria-hidden="true">
      <strong>800 €</strong>
      <div className="ts-regler">
        <span className="ts-regler__spur" />
        <span className="ts-regler__griff" />
      </div>
      <div className="ts-grenze__skala">
        <small>Läuft direkt</small>
        <small>Sie entscheiden</small>
      </div>
    </div>
  );
}

export function BentoBudget() {
  return (
    <div className="ts-ring" aria-hidden="true">
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" className="ts-ring__spur" />
        <circle cx="18" cy="18" r="15.9" className="ts-ring__wert" />
      </svg>
      <span>
        <b>62 %</b>
        <small>von 20.000 €</small>
      </span>
    </div>
  );
}

export function BentoMitteilung() {
  return (
    <div className="ts-mitteilung ts-mitteilung--dunkel" aria-hidden="true">
      <span className="ts-mitteilung__icon">
        <Megaphone size={16} />
      </span>
      <small>An alle im Haus · Aushang und online</small>
      <b>Am Montag wird der Aufzug gewartet, 8 bis 12 Uhr.</b>
    </div>
  );
}

export function BentoExport() {
  return (
    <div className="ts-export" aria-hidden="true">
      <div className="ts-export__kopf">
        <FileSpreadsheet size={16} />
        <b>kosten-leopoldstr-10-2026.csv</b>
      </div>
      <div className="ts-export__zeilen">
        <span>Heizung</span>
        <span>1.840,00</span>
        <span>Sanitär</span>
        <span>2.310,50</span>
        <span>Elektro</span>
        <span>640,00</span>
      </div>
    </div>
  );
}

export function BentoMelden() {
  return (
    <div className="ts-glocke" aria-hidden="true">
      <Bell size={18} />
      <span>
        <b>3 neue Meldungen</b>
        <small>mit Fotos, sortiert nach Haus</small>
      </span>
    </div>
  );
}

/* ───────────── Problem ───────────── */

export function ProblemAnrufe() {
  return (
    <ul className="ts-anrufe" aria-hidden="true">
      {["Sanitär Maier", "Elektro Schulz", "Hausmeister-Service"].map((n, i) => (
        <li key={n}>
          <PhoneMissed size={15} />
          <span>
            <b>{n}</b>
            <small>{["Mailbox", "Keine Antwort", "Mailbox"][i]}</small>
          </span>
          <em>{["Mo", "Di", "Mi"][i]}</em>
        </li>
      ))}
    </ul>
  );
}

export function ProblemFrist() {
  return (
    <div className="ts-fristen-paar" aria-hidden="true">
      <div className="ts-frist">
        <span className="ts-frist__icon">
          <AlertTriangle size={18} />
        </span>
        <span>
          <b>Rauchwarnmelder</b>
          <small>Leopoldstr. 10 · seit 3 Wochen überfällig</small>
        </span>
      </div>
      <div className="ts-frist ts-frist--bald">
        <span className="ts-frist__icon">
          <CalendarClock size={18} />
        </span>
        <span>
          <b>Aufzug Hauptprüfung</b>
          <small>Isarstr. 5 · in 5 Tagen</small>
        </span>
      </div>
    </div>
  );
}

export function ProblemFragen() {
  return (
    <div className="ts-fragen" aria-hidden="true">
      <p>
        <MessageCircle size={14} /> Wann kommt endlich jemand?
      </p>
      <p className="ts-fragen--rechts">Was hat das gekostet?</p>
      <p>Ist das schon beauftragt?</p>
    </div>
  );
}

/* ───────────── Ausführung ───────────── */

export function AusfuehrungKarte() {
  return (
    <div className="ts-karte ts-einsatz" aria-hidden="true">
      <div className="ts-einsatz__kopf">
        <span className="ts-einsatz__avatar">SH</span>
        <span>
          <b>Sanitär Huber</b>
          <small>Partnerbetrieb · Heizung und Sanitär</small>
        </span>
        <Status ton="fertig">Vor Ort</Status>
      </div>
      <div className="ts-einsatz__zeile">
        <CalendarClock size={15} />
        <span>Di 14. Nov. · 9:00 bis 11:00</span>
      </div>
      <div className="ts-einsatz__fotos">
        <span />
        <span />
        <span />
      </div>
      <div className="ts-einsatz__zeile ts-einsatz__zeile--ok">
        <ClipboardCheck size={15} />
        <span>Abnahme mit Fotos · Rechnung geprüft</span>
      </div>
    </div>
  );
}
