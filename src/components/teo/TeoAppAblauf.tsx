"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Paperclip } from "lucide-react";

type Bild = { src: string; breite: number; hoehe: number; alt: string };
type Mail = {
  richtung: "an" | "von";
  wer: string;
  betreff: string;
  text: string;
  anhaenge?: string[];
  knoepfe?: string[];
};
type Schritt = { titel: string; text: string; bild?: Bild; handy?: Bild; mail?: Mail };
type Weg = "portal" | "mail";

/**
 * Ablauf aus Sicht der Verwaltung — zwei Wege:
 * mit Portal (echte Screenshots aus dem Arbeitsplatz, Musterdaten auf Staging) oder ohne Portal aus dem eigenen System (E-Mail).
 */
const SCHRITTE: Record<Weg, Schritt[]> = {
  portal: [
    {
      titel: "Die Meldung kommt vollständig bei Ihnen an.",
      text: "Mieter melden über den QR-Code im Treppenhaus, mit Foto und Wohnung. Ohne Konto und ohne Anruf. Die Meldung steht sofort in Ihrer Liste, dringende Fälle sind markiert.",
      bild: { src: "/brand/teo/app/liste.jpg", breite: 1600, hoehe: 860, alt: "Vorgangsliste im teo-Arbeitsplatz mit neuen und laufenden Vorgängen" },
      handy: { src: "/brand/teo/app/mieter.jpg", breite: 487, hoehe: 1000, alt: "Schadenmeldung eines Mieters auf dem Handy" },
    },
    {
      titel: "Akut oder unter Ihrer Grenze? Wir legen sofort los.",
      text: "Sie legen je Haus fest, welche Fälle sofort laufen, etwa austretendes Wasser oder eine kalte Wohnung, und bis zu welchem Betrag wir direkt beauftragen. Nur was darüber liegt, geben Sie frei, mit einem Klick.",
      bild: { src: "/brand/teo/app/freigabe.jpg", breite: 1600, hoehe: 721, alt: "Angebot mit Positionen und dem Knopf „Freigeben“" },
    },
    {
      titel: "Sie sehen den Fortschritt, ohne anzurufen.",
      text: "Der Handwerker hält jeden Schritt mit Fotos fest. Sie, der Eigentümer und der Mieter sehen denselben Stand.",
      bild: { src: "/brand/teo/app/tagebuch.jpg", breite: 1200, hoehe: 735, alt: "Verlauf eines Wasserschadens mit Fotos des Handwerkers" },
    },
    {
      titel: "Am Ende bekommen Sie eine Rechnung.",
      text: "Mit Abnahme und Fotos, auch wenn mehrere Betriebe beteiligt waren. Angebot, Dokumente und Notizen liegen gesammelt beim Vorgang.",
      bild: { src: "/brand/teo/app/dokumente.jpg", breite: 1600, hoehe: 815, alt: "Dokumente eines erledigten Vorgangs: Rechnung, Abnahmeprotokoll und Angebot" },
    },
  ],
  mail: [
    {
      titel: "Sie schicken den Auftrag per E-Mail.",
      text: "Aus Ihrem Postfach oder Ihrer Verwaltungssoftware an Ihre feste Auftragsadresse. Ohne Umstieg, ohne neues Programm.",
      mail: {
        richtung: "an",
        wer: "auftrag+ihre-verwaltung@eingang.servus-teo.de",
        betreff: "Wasserschaden Bad · Hohenzollernstraße 31, WE 3",
        text: "Mieter meldet Wasser an der Decke im Bad. Fotos anbei, Herr Berger ist ab 8 Uhr zu Hause.",
        anhaenge: ["decke.jpg", "bad.jpg"],
      },
    },
    {
      titel: "Sie geben mit einem Klick frei.",
      text: "Akute Fälle und alles unter Ihrer Grenze erledigen wir direkt. Liegt ein Angebot darüber, kommt eine E-Mail mit „Freigeben“. Ohne Anmeldung.",
      mail: {
        richtung: "von",
        wer: "Servus TEO",
        betreff: "Freigabe erforderlich · Hohenzollernstraße 31",
        text: "Das Angebot über 1.840,00 € netto liegt über Ihrer Freigabegrenze.",
        anhaenge: ["Angebot.pdf"],
        knoepfe: ["Freigeben", "Ablehnen"],
      },
    },
    {
      titel: "Sie bekommen jeden Schritt per E-Mail.",
      text: "Termin, Fotos und Abnahme landen in Ihrem Postfach. Sie hängen sie an Ihren Vorgang, wie Sie es gewohnt sind.",
      mail: {
        richtung: "von",
        wer: "Servus TEO",
        betreff: "Erledigt · Wasserschaden Bad, Hohenzollernstraße 31",
        text: "Die Leitung ist abgedichtet, die Decke getrocknet. Fotos und Abnahme anbei.",
        anhaenge: ["Fotos.zip", "Abnahme.pdf"],
      },
    },
    {
      titel: "Am Ende bekommen Sie eine Rechnung.",
      text: "Als PDF, mit Abnahme und Fotos. Auch wenn mehrere Betriebe beteiligt waren.",
      mail: {
        richtung: "von",
        wer: "Servus TEO",
        betreff: "Rechnung · Hohenzollernstraße 31",
        text: "Anbei die Rechnung zum Wasserschaden Bad.",
        anhaenge: ["Rechnung.pdf"],
      },
    },
  ],
};

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

/** E-Mail als Bild (kein echtes Formular), für den Weg ohne Portal */
function MailAnsicht({ mail }: { mail: Mail }) {
  return (
    <div className="ts-app__fenster ts-mail" role="img" aria-label={`E-Mail: ${mail.betreff}`}>
      <div className="ts-app__leiste" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="ts-mail__kopf">
        <p>
          <b>{mail.richtung === "an" ? "An" : "Von"}</b> {mail.wer}
        </p>
        <p className="ts-mail__betreff">{mail.betreff}</p>
      </div>
      <div className="ts-mail__text">
        <p>{mail.text}</p>
        {mail.knoepfe?.length ? (
          <div className="ts-mail__knoepfe">
            {mail.knoepfe.map((k, i) => (
              <span key={k} className={i === 0 ? "ts-mail__knopf ts-mail__knopf--haupt" : "ts-mail__knopf"}>
                {k}
              </span>
            ))}
          </div>
        ) : null}
        {mail.anhaenge?.length ? (
          <div className="ts-mail__anhaenge">
            {mail.anhaenge.map((a) => (
              <span key={a}>
                <Paperclip size={13} strokeWidth={2} aria-hidden="true" />
                {a}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TeoAppAblauf() {
  const [weg, setWeg] = useState<Weg>("portal");
  return (
    <section className={`ts-abschnitt ts-ablauf ts-ablauf--${weg}`} id="ablauf">
      <div className="teo-innen">
        <h2 className="ts-zentriert-text ts-zweizeilig">
          <span>So arbeiten Sie mit uns.</span> <span className="ts-blau">Mit Portal oder ohne.</span>
        </h2>
        <div className="ts-ablauf__umschalter" role="tablist" aria-label="Wie Sie mit uns arbeiten">
          <button type="button" role="tab" aria-selected={weg === "portal"} className={weg === "portal" ? "ist-aktiv" : ""} onClick={() => setWeg("portal")}>
            Im teo-Portal
          </button>
          <button type="button" role="tab" aria-selected={weg === "mail"} className={weg === "mail" ? "ist-aktiv" : ""} onClick={() => setWeg("mail")}>
            Aus Ihrem System, per E-Mail
          </button>
        </div>
        <ol className="ts-app" key={weg}>
          {SCHRITTE[weg].map((s, i) => (
            <li key={s.titel + i} className="ts-app__schritt">
              <div className="ts-app__text">
                <span className="ts-app__nr">{i + 1}</span>
                <h3>{s.titel}</h3>
                <p>{s.text}</p>
              </div>
              <div className={`ts-app__bild ${s.handy ? "ts-app__bild--handy" : ""}`}>
                {s.mail ? <MailAnsicht mail={s.mail} /> : s.bild ? <Fenster bild={s.bild} /> : null}
                {s.handy ? (
                  <div className="ts-app__handy">
                    <img src={s.handy.src} alt={s.handy.alt} width={s.handy.breite} height={s.handy.hoehe} loading="lazy" decoding="async" />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
