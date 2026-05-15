"use client";

import Image from "next/image";
import { SITE_CONFIG } from "@/lib/config";
import {
  LEISTUNGEN,
  RATGEBER,
  leistungHref,
  ratgeberHref,
} from "@/lib/routes";
import {
  FooterSocialLinks,
  FooterWhatsAppIconLink,
} from "@/components/layout/FooterSocialLinks";
import { WHATSAPP_URL_FRAGE } from "@/lib/whatsapp";

function FooterWhatsAppCta({ variant }: { variant: "mobile" | "desktop" }) {
  return (
    <div
      className={
        variant === "mobile"
          ? "footer-whatsapp-cta footer-whatsapp-cta--mobile"
          : "footer-whatsapp-cta footer-whatsapp-cta--desktop"
      }
    >
      <p>Noch Fragen? Wir antworten schnell auf WhatsApp.</p>
      <a
        href={WHATSAPP_URL_FRAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-cta"
      >
        WhatsApp schreiben →
      </a>
    </div>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="footer-mobile-head">
          <FooterWhatsAppIconLink />
          <div className="footer-mobile-logo-wrap">
            <Image
              src="/logo-mark-white.png"
              alt="Bärenwald München"
              width={54}
              height={54}
              className="site-footer-logo-img"
            />
            <p className="footer-mobile-brand-name">Bärenwald München</p>
          </div>
          <p className="footer-mobile-tagline">
            Handwerk. Koordination.
            <br />
            Verantwortung.
          </p>
          <FooterSocialLinks className="footer-mobile-social" secondaryIconsOnly />
          <FooterWhatsAppCta variant="mobile" />
        </div>

        <div className="site-footer-grid">
          <div>
            <div className="footer-desktop-brand">
              <div className="footer-desktop-brand-head">
                <FooterWhatsAppIconLink />
                <div className="site-footer-logo-wrap">
                  <Image
                    src="/logo-mark-white.png"
                    alt="Bärenwald München"
                    width={54}
                    height={54}
                    className="site-footer-logo-img"
                  />
                  <p className="site-footer-brand-name">Bärenwald</p>
                </div>
                <FooterSocialLinks secondaryIconsOnly />
              </div>
            </div>
            <div className="footer-links-col">
              <p className="site-footer-subtitle">Schnellzugriff</p>
              <ul className="site-footer-links">
                <li>
                  <a href="/">Startseite</a>
                </li>
                <li>
                  <a href="/ratgeber">Ratgeber-Übersicht</a>
                </li>
                <li>
                  <a href="/rechner">Preisrechner</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-links-col">
            <p className="site-footer-col-title">Leistungen</p>
            <ul className="site-footer-links">
              {LEISTUNGEN.map((l) => (
                <li key={l.slug}>
                  <a href={leistungHref(l.slug)}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-links-col">
            <p className="site-footer-col-title">Ratgeber & Kosten</p>
            <ul className="site-footer-links">
              {RATGEBER.map((r) => (
                <li key={r.slug}>
                  <a href={ratgeberHref(r.slug)}>{r.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div id="kontakt" className="footer-links-col">
            <p className="site-footer-col-title">Kontakt</p>
            <div className="site-footer-contact">
              <p>
                <a href={SITE_CONFIG.phoneHref}>{SITE_CONFIG.phone}</a>
              </p>
              <p>
                <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>
              </p>
              <p>München &amp; Umgebung</p>
            </div>
            <FooterWhatsAppCta variant="desktop" />
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
            <span className="footer-slim-tag">München &amp; Umgebung.</span>
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
