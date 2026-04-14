"use client";

import { SITE_CONFIG } from "@/lib/config";
import {
  LEISTUNGEN,
  RATGEBER,
  RATGEBER_SITUATIONEN,
  leistungHref,
  ratgeberHref,
} from "@/lib/routes";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  const telHref = `tel:${SITE_CONFIG.phone.replace(/\s/g, "")}`;

  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-grid">
          <div>
            <p className="site-footer-col-title">Marke</p>
            <p className="site-footer-brand-name">Bärenwald</p>
            <p className="site-footer-brand-tag">
              Stark wie ein Bär. Verlässlich wie der Wald.
            </p>
            <p className="site-footer-subtitle">Schnellzugriff</p>
            <ul className="site-footer-links">
              <li>
                <a href="/">Startseite</a>
              </li>
              <li>
                <a href="/ratgeber">Ratgeber-Übersicht</a>
              </li>
              <li>
                <a href="/#leistungen">Leistungen (Übersicht)</a>
              </li>
              <li>
                <a href="/rechner">Preisrechner</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="site-footer-col-title">Leistungen</p>
            <ul className="site-footer-links">
              {LEISTUNGEN.map((l) => (
                <li key={l.slug}>
                  <a href={leistungHref(l.slug)}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="site-footer-col-title">Ratgeber & Kosten</p>
            <ul className="site-footer-links">
              {RATGEBER.map((r) => (
                <li key={r.slug}>
                  <a href={ratgeberHref(r.slug)}>{r.label}</a>
                </li>
              ))}
            </ul>
            <p className="site-footer-subtitle">Situationen</p>
            <ul className="site-footer-links">
              {RATGEBER_SITUATIONEN.map((r) => (
                <li key={r.slug}>
                  <a href={ratgeberHref(r.slug)}>{r.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="site-footer-col-title">Kontakt</p>
            <div className="site-footer-contact">
              <p>
                <a href={telHref}>{SITE_CONFIG.phone}</a>
              </p>
              <p>
                <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>
              </p>
              <p>München &amp; Umgebung</p>
            </div>
            <a href="/kontakt" className="site-footer-contact-cta">
              Jetzt Angebot anfordern →
            </a>
            <p className="site-footer-subtitle">Information</p>
            <ul className="site-footer-links">
              <li>
                <a href="/ueber-uns">Über uns</a>
              </li>
              <li>
                <a href="/kontakt">Kontakt</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-slim">
        <div className="footer-slim-inner">
          <p className="footer-slim-brand">
            <span className="footer-slim-name">Bärenwald</span>
            <span className="footer-slim-sep" aria-hidden>
              ·
            </span>
            <span className="footer-slim-tag">Handwerksgruppe München.</span>
          </p>
          <nav className="footer-slim-nav" aria-label="Rechtliches">
            <a href="/impressum">Impressum</a>
            <a href="/datenschutz">Datenschutz</a>
            <a href="/agb">AGB</a>
          </nav>
          <p className="footer-slim-copy">© {year} Bärenwald</p>
        </div>
      </div>
    </footer>
  );
}
