"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { submitTeoAnfrageAction } from "@/app/actions/submit-teo-anfrage";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { TeoIcon3D } from "@/components/teo/TeoIcon3D";
import { TeoLogo } from "@/components/teo/TeoRahmen";
import { TEO_USPS } from "@/components/teo/teo-usps";
import { track } from "@/lib/analytics";
import { neueFotoSitzung } from "@/lib/funnel/fotos-hochladen";
import { TEO_ABSENDER, TEO_BEWOHNER_ROLLEN, TEO_SITUATIONEN, type TeoAnfrageDaten, type TeoBewohnerRolle } from "@/lib/funnel/teo-anfrage";
import { cn } from "@/lib/utils";

import "@/app/baerenwald-landing.css";
import "@/app/teo-landing.css";
import "@/app/teo-anfrage.css";

/**
 * Servus TEO: Kontaktformular für interessierte Verwaltungen und Bestandshalter (ein Schritt).
 * Einstieg von der Startseite (?s=heizung …) füllt das Thema vor. Landet im CRM als Anfrage (Fall „Kennenlernen“).
 */
export function TeoKontakt() {
  const [absender, setAbsender] = useState<TeoAnfrageDaten["absender"]>("hausverwaltung");
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [haeuser, setHaeuser] = useState("");
  const [einheiten, setEinheiten] = useState("");
  const [nachricht, setNachricht] = useState("");
  // Mieter oder Wohnungseigentümer
  const [rolle, setRolle] = useState<TeoBewohnerRolle | "">("");
  const [strasse, setStrasse] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [thema, setThema] = useState<string | null>(null);
  const [datenschutz, setDatenschutz] = useState(false);
  const [dsFehler, setDsFehler] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const gestartet = useRef(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("s");
    const sit = TEO_SITUATIONEN.find((x) => x.id === id);
    if (sit) setThema(sit.label);
    if (!gestartet.current) {
      gestartet.current = true;
      track.teoAnfrageStart(sit?.id ?? "direkt");
      track.teoAnfrageSchritt(1, "Kontakt");
    }
  }, []);

  const feld = TEO_ABSENDER.find((a) => a.id === absender)?.feld ?? "Name der Verwaltung";
  const bewohner = absender === "bewohner";

  async function senden() {
    setFehler(null);
    if (name.trim().length < 2) return setFehler("Bitte geben Sie Ihren Namen an.");
    if (!email.trim() && !telefon.trim()) return setFehler("Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFehler("Bitte geben Sie eine gültige E-Mail-Adresse an.");
    if (bewohner) {
      if (!rolle) return setFehler("Bitte wählen Sie Mieter oder Eigentümer.");
      if (strasse.trim().length < 3) return setFehler("Bitte geben Sie Straße und Hausnummer an.");
      if (!/^\d{5}$/.test(plz.trim())) return setFehler("Bitte geben Sie die PLZ an.");
      if (nachricht.trim().length < 5) return setFehler("Bitte beschreiben Sie kurz, worum es geht.");
    }
    if (!datenschutz) return setDsFehler(true);
    setStatus("loading");
    const beschreibung = [thema ? `Thema: ${thema}` : "", nachricht.trim()].filter(Boolean).join("\n\n");
    try {
      const res = await submitTeoAnfrageAction({
        fall: bewohner ? "schaden" : "kennenlernen",
        absender,
        schadenArten: [],
        schadenOrt: "",
        einheit: "",
        dringlichkeit: "",
        kontaktVorOrt: "",
        massnahmen: [],
        frist: "",
        einheiten: "",
        baujahr: "",
        leistungen: [],
        treppenhaeuser: "",
        start: "",
        objekteAnzahl: bewohner ? "" : haeuser,
        einheitenGesamt: bewohner ? "" : einheiten,
        strasse: bewohner ? strasse : "",
        plz: bewohner ? plz : "",
        ort: bewohner ? ort : "",
        beschreibung,
        name,
        firma: bewohner ? "" : firma,
        bewohnerRolle: bewohner ? rolle : "",
        verwaltung: bewohner ? firma : "",
        email,
        telefon,
        datenschutz,
        sitzung: neueFotoSitzung(),
        fotos: [],
      });
      if (!res.ok) {
        setStatus("idle");
        setFehler(res.error);
        return;
      }
      track.teoAnfrageAbgeschickt(bewohner ? `bewohner_${rolle}` : "kontakt");
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    } catch (e) {
      setStatus("idle");
      setFehler(e instanceof Error ? e.message : "Bitte versuchen Sie es erneut.");
    }
  }

  return (
    <div className="teo-site ta">
      <div className="ta-grund" aria-hidden="true" />

      <header className="ta-kopf">
        <Link href="/" className="ta-kopf__marke" aria-label="Zur Startseite">
          <TeoLogo />
        </Link>
        <Link href="/" className="ta-rund" aria-label="Schließen">
          <X size={18} />
        </Link>
      </header>

      <main className="ta-main ta-main--kontakt">
        <aside className="ta-seite">
          <h2>
            <span>Lernen wir uns kennen.</span> <span className="ta-blau">Wir melden uns am nächsten Werktag.</span>
          </h2>
          <ul>
            {TEO_USPS.map((u) => (
              <li key={u.text}>
                <span className="ta-seite__icon ta-seite__icon--bild">
                  <TeoIcon3D name={u.bild} size={36} />
                </span>
                {u.text}
              </li>
            ))}
          </ul>
        </aside>

        {status === "done" ? (
          <div className="ta-karte ta-danke">
            <span className="ta-danke__icon">
              <svg viewBox="0 0 52 52" width="40" height="40" aria-hidden="true">
                <circle className="ta-danke__kreis" cx="26" cy="26" r="23" pathLength={1} />
                <path className="ta-danke__haken" d="M15 27l7.5 7.5L37 19" pathLength={1} />
              </svg>
            </span>
            <h1>Danke, Ihre Nachricht ist da.</h1>
            <p>{bewohner ? "Wir kümmern uns und melden uns bei Ihnen." : "Wir melden uns am nächsten Werktag."}</p>
            <Link href="/" className="teo-btn">
              Zur Startseite
            </Link>
          </div>
        ) : (
          <form
            className="ta-karte"
            onSubmit={(e) => {
              e.preventDefault();
              void senden();
            }}
          >
            <h1>Kontakt aufnehmen</h1>
            {thema ? (
              <p className="ta-vorwahl">
                <span>{thema}</span>
                <button type="button" onClick={() => setThema(null)}>
                  entfernen
                </button>
              </p>
            ) : null}

            <div className="ta-feld">
              <span className="ta-feld__label">Sie sind</span>
              <div className="ta-pillen" role="radiogroup">
                {TEO_ABSENDER.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={absender === a.id}
                    className={cn("ta-pille", absender === a.id && "ist-gewaehlt")}
                    onClick={() => setAbsender(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {bewohner ? (
              <div className="ta-feld">
                <span className="ta-feld__label">Sie sind dort *</span>
                <div className="ta-pillen" role="radiogroup">
                  {TEO_BEWOHNER_ROLLEN.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={rolle === r.id}
                      className={cn("ta-pille", rolle === r.id && "ist-gewaehlt")}
                      onClick={() => setRolle(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="ta-zeile">
              <label className="ta-feld">
                <span className="ta-feld__label">Ihr Name *</span>
                <input className="ta-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="ta-feld">
                <span className="ta-feld__label">{feld}</span>
                <input className="ta-input" autoComplete="organization" value={firma} onChange={(e) => setFirma(e.target.value)} />
              </label>
            </div>
            <div className="ta-zeile">
              <label className="ta-feld">
                <span className="ta-feld__label">E-Mail-Adresse</span>
                <input
                  type="email"
                  className="ta-input"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="ta-feld">
                <span className="ta-feld__label">Telefonnummer</span>
                <input type="tel" className="ta-input" autoComplete="tel" inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
              </label>
            </div>
            {bewohner ? (
              <>
                <label className="ta-feld">
                  <span className="ta-feld__label">Straße und Hausnummer *</span>
                  <input className="ta-input" autoComplete="street-address" value={strasse} onChange={(e) => setStrasse(e.target.value)} />
                </label>
                <div className="ta-zeile ta-zeile--plz">
                  <label className="ta-feld">
                    <span className="ta-feld__label">PLZ *</span>
                    <input
                      className="ta-input"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={5}
                      value={plz}
                      onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    />
                  </label>
                  <label className="ta-feld">
                    <span className="ta-feld__label">Ort</span>
                    <input className="ta-input" autoComplete="address-level2" value={ort} onChange={(e) => setOrt(e.target.value)} />
                  </label>
                </div>
              </>
            ) : (
            <div className="ta-zeile">
              <label className="ta-feld">
                <span className="ta-feld__label">Häuser (ca.)</span>
                <input className="ta-input" inputMode="numeric" value={haeuser} onChange={(e) => setHaeuser(e.target.value.replace(/\D/g, ""))} />
              </label>
              <label className="ta-feld">
                <span className="ta-feld__label">Einheiten (ca.)</span>
                <input className="ta-input" inputMode="numeric" value={einheiten} onChange={(e) => setEinheiten(e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>
            )}
            <label className="ta-feld">
              <span className="ta-feld__label">{bewohner ? "Was ist passiert? *" : "Nachricht (optional)"}</span>
              <textarea
                className="ta-input ta-textarea"
                rows={4}
                maxLength={2000}
                placeholder={bewohner ? "z. B. Seit gestern tropft es im Bad von der Decke." : "z. B. Was kostet Sie heute am meisten Zeit?"}
                value={nachricht}
                onChange={(e) => setNachricht(e.target.value)}
              />
            </label>
            <DatenschutzCheckbox
              checked={datenschutz}
              onChange={(v) => {
                setDatenschutz(v);
                if (v) setDsFehler(false);
              }}
              showError={dsFehler}
            />
            {fehler ? (
              <p className="ta-fehler" role="alert" key={fehler}>
                {fehler}
              </p>
            ) : null}
            <div className="ta-kontakt__aktion">
              <button type="submit" className="teo-btn ta-weiter" disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <span className="ta-lade" aria-hidden="true" />
                    Wird gesendet…
                  </>
                ) : (
                  "Nachricht senden"
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
