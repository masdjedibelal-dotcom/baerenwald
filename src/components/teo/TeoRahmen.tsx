import Link from "next/link";
import type { ReactNode } from "react";

import { CookieSettingsLink } from "@/components/consent/CookieSettingsLink";
import { MARKE } from "@/lib/marke";

import "@/app/teo-landing.css";

/** Anfrage für Verwaltungen und Bestandshalter (auf TEO zeigt /rechner die Anfrage, ohne Preise). */
export const TEO_LINK_ANFRAGE = "/rechner";

/** Wortmarke „teo.“ — aus dem quadratischen Logo zugeschnitten. */
export function TeoLogo({ hell = false }: { hell?: boolean }) {
  return (
    <span className="teo-logo" aria-label={MARKE.nameLang} role="img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hell ? "/brand/teo/logo-mark-white.png" : "/brand/teo/logo-mark-green.png"} alt="" />
    </span>
  );
}

function TeoKopf() {
  return (
    <header className="teo-kopf">
      <div className="teo-kopf__innen">
        <Link href="/" className="teo-kopf__marke" aria-label={`${MARKE.nameLang} — Startseite`}>
          <TeoLogo />
        </Link>
        <nav className="teo-kopf__nav" aria-label="Hauptnavigation">
          <Link href="/#loesung">So arbeiten wir</Link>
          <Link href="/#funktionen">Vorteile</Link>
          <Link href="/#warum">Warum teo</Link>
          <Link href="/#faq">Fragen</Link>
        </nav>
        <div className="teo-kopf__aktionen">
          <Link href="/portal/login" className="teo-kopf__login">
            Anmelden
          </Link>
          <Link href={TEO_LINK_ANFRAGE} className="teo-btn teo-btn--klein">
            Anfrage stellen
          </Link>
        </div>
      </div>
    </header>
  );
}

function TeoFuss() {
  const f = MARKE.firma;
  return (
    <footer className="teo-fuss">
      <div className="teo-fuss__innen">
        <div className="teo-fuss__marke">
          <TeoLogo hell />
          <p>Technische Betreuung für Verwaltungen und Bestandshalter in München.</p>
          <p className="teo-fuss__adresse">
            {f.firmenname} · {f.strasse} {f.hausnummer} · {f.plz} {f.ort}
            <br />
            <a href={`mailto:${f.email}`}>{f.email}</a>
          </p>
        </div>
        <nav className="teo-fuss__links" aria-label="Fußzeile">
          <Link href="/#loesung">So arbeiten wir</Link>
          <Link href="/#warum">Warum teo</Link>
          <Link href="/#faq">Fragen</Link>
          <Link href={TEO_LINK_ANFRAGE}>Anfrage stellen</Link>
          <Link href="/portal/login">{MARKE.portalName} anmelden</Link>
        </nav>
        <nav className="teo-fuss__links" aria-label="Rechtliches">
          <Link href={MARKE.recht.impressum}>Impressum</Link>
          <Link href={MARKE.recht.datenschutz}>Datenschutz</Link>
          <Link href={MARKE.recht.agb}>AGB</Link>
          <CookieSettingsLink />
        </nav>
      </div>
      <p className="teo-fuss__copy">© {new Date().getFullYear()} {f.firmenname}</p>
    </footer>
  );
}

/** Kopf + Fuß der TEO-Website (Startseite, Rechtstexte). */
export function TeoRahmen({ children }: { children: ReactNode }) {
  return (
    <div className="teo-site">
      <TeoKopf />
      <main>{children}</main>
      <TeoFuss />
    </div>
  );
}
