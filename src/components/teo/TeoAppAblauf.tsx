/* eslint-disable @next/next/no-img-element */

type Bild = { src: string; breite: number; hoehe: number; alt: string };
type Schritt = { titel: string; text: string; bild: Bild; handy?: Bild };

/**
 * Ablauf aus Sicht der Verwaltung, mit echten Screenshots aus dem Arbeitsplatz (Musterdaten auf Staging).
 * Bilder: public/brand/teo/app/*.jpg
 */
const SCHRITTE: Schritt[] = [
  {
    titel: "Die Meldung kommt vollständig bei Ihnen an.",
    text: "Mieter melden über den QR-Code im Treppenhaus, mit Foto und Wohnung. Ohne Konto und ohne Anruf. Die Meldung steht sofort in Ihrer Liste, dringende Fälle sind markiert.",
    bild: { src: "/brand/teo/app/liste.jpg", breite: 1600, hoehe: 860, alt: "Vorgangsliste im teo-Arbeitsplatz mit neuen und laufenden Vorgängen" },
    handy: { src: "/brand/teo/app/mieter.jpg", breite: 487, hoehe: 1000, alt: "Schadenmeldung eines Mieters auf dem Handy" },
  },
  {
    titel: "Sie entscheiden nur, was über Ihrer Grenze liegt.",
    text: "Bis zu dem Betrag, den Sie je Haus festlegen, beauftragen wir direkt. Liegt ein Angebot darüber, sehen Sie alle Positionen und geben mit einem Klick frei.",
    bild: { src: "/brand/teo/app/freigabe.jpg", breite: 1600, hoehe: 721, alt: "Angebot mit Positionen und dem Knopf „Freigeben“" },
  },
  {
    titel: "Sie sehen den Fortschritt, ohne anzurufen.",
    text: "Der Handwerker hält jeden Schritt mit Fotos fest. Sie, der Eigentümer und der Mieter sehen denselben Stand.",
    bild: { src: "/brand/teo/app/tagebuch.jpg", breite: 1200, hoehe: 735, alt: "Verlauf eines Wasserschadens mit Fotos des Handwerkers" },
  },
  {
    titel: "Rückfragen klären Sie direkt im Vorgang.",
    text: "Nachrichten, Termine, Angebot und Rechnung liegen an einer Stelle. Am Ende bekommen Sie eine Rechnung von uns, mit Abnahme und Fotos.",
    bild: { src: "/brand/teo/app/nachrichten.jpg", breite: 1600, hoehe: 829, alt: "Nachrichten zwischen Verwaltung und teo zu einem Vorgang" },
  },
];

function Fenster({ bild }: { bild: Bild }) {
  return (
    <div className="ts-app__fenster">
      <div className="ts-app__leiste" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <img src={bild.src} alt={bild.alt} width={bild.breite} height={bild.hoehe} loading="lazy" decoding="async" />
    </div>
  );
}

export function TeoAppAblauf() {
  return (
    <ol className="ts-app">
      {SCHRITTE.map((s, i) => (
        <li key={s.titel} className="ts-app__schritt">
          <div className="ts-app__text">
            <span className="ts-app__nr">{i + 1}</span>
            <h3>{s.titel}</h3>
            <p>{s.text}</p>
          </div>
          <div className={`ts-app__bild ${s.handy ? "ts-app__bild--handy" : ""}`}>
            <Fenster bild={s.bild} />
            {s.handy ? (
              <div className="ts-app__handy">
                <img src={s.handy.src} alt={s.handy.alt} width={s.handy.breite} height={s.handy.hoehe} loading="lazy" decoding="async" />
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
